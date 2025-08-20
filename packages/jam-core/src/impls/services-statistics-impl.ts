import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  E_sub_int,
  JamCodecable,
  jsonCodec,
  MapJSONCodec,
  NumberJSONCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import {
  Gas,
  Posterior,
  ServiceIndex,
  ServicesStatistics,
  SingleServiceStatistics,
  u16,
  u32,
  Tagged,
  Validated,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { ConditionalExcept } from "type-fest";
import type { PreimagesExtrinsicImpl } from "./extrinsics/preimages";
import { SingleServiceStatisticsImpl } from "./single-service-statistics-impl";
import type { WorkReportImpl } from "./work-report-impl";
import type { AccumulationStatisticsImpl } from "./accumulation-statistics-impl";

@JamCodecable()
export class ServicesStatisticsImpl
  extends BaseJamCodecable
  implements ServicesStatistics
{
  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "record" },
      NumberJSONCodec(),
      SingleServiceStatisticsImpl,
    ),
    SINGLE_ELEMENT_CLASS,
  )
  @binaryCodec(
    buildGenericKeyValueCodec(
      E_sub_int<ServiceIndex>(4),
      SingleServiceStatisticsImpl,
      (a, b) => a - b,
    ),
  )
  elements!: Map<ServiceIndex, SingleServiceStatisticsImpl>;

  constructor(config?: ConditionalExcept<ServicesStatisticsImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  /**
   * $(0.7.1 - 13.12)
   */
  toPosterior(deps: {
    ep: Validated<PreimagesExtrinsicImpl>;
    /**
     * `bold S` - from $(0.7.1 - 12.26)
     */
    accumulationStatistics: AccumulationStatisticsImpl;

    guaranteedReports: Tagged<WorkReportImpl[], "bold I">;
  }): Posterior<ServicesStatisticsImpl> {
    const toRet = new ServicesStatisticsImpl({ elements: new Map() });

    // $(0.7.1 - 13.14)
    const s_r = new Set(
      deps.guaranteedReports
        .map((r) => r.digests)
        .flat()
        .map((res) => res.serviceIndex),
    );

    // $(0.7.1 - 13.15)
    const s_p = new Set(deps.ep.elements.map((p) => p.requester));

    // $(0.7.1 - 13.13)
    const bold_s = new Set([
      ...s_p,
      ...s_r,
      ...deps.accumulationStatistics.services(),
    ]);

    for (const service of bold_s) {
      const provided = deps.ep.elements
        .filter(({ requester }) => requester === service)
        .map(({ blob }) => ({
          count: <u16>1,
          size: <u32>blob.length,
        }))
        .reduce(
          (a, b) => ({
            count: <u16>(a.count + b.count),
            size: <u32>(a.size + b.size),
          }),
          { count: <u16>0, size: <u32>0 },
        );

      toRet.elements.set(
        service,
        new SingleServiceStatisticsImpl({
          ...R_fn(service, deps.guaranteedReports),
          providedCount: provided.count,
          providedSize: provided.size,
          accumulateCount:
            deps.accumulationStatistics.get(service)?.count ?? <u32>0,
          accumulateGasUsed:
            deps.accumulationStatistics.get(service)?.gasUsed ?? <Gas>0n,
        }),
      );
    }

    return toPosterior(toRet);
  }

  static newEmpty(): ServicesStatisticsImpl {
    return new ServicesStatisticsImpl({ elements: new Map() });
  }
}

/**
 * $(0.7.1 - 13.16)
 */
const R_fn = (
  service: ServiceIndex,
  /**
   * `bold I`
   */
  guaranteedReports: Tagged<WorkReportImpl[], "bold I">,
): Pick<
  SingleServiceStatistics,
  | "importCount"
  | "exportCount"
  | "extrinsicSize"
  | "extrinsicCount"
  | "refinementCount"
  | "refinementGasUsed"
> => {
  return guaranteedReports
    .map((report) => report.digests)
    .flat()
    .filter((result) => result.serviceIndex === service)
    .map((result) => ({
      refinementCount: <u32>1,
      refinementGasUsed: result.refineLoad.gasUsed,
      importCount: result.refineLoad.importCount,
      extrinsicCount: result.refineLoad.extrinsicCount,
      extrinsicSize: result.refineLoad.extrinsicSize,
      exportCount: result.refineLoad.exportCount,
    }))
    .reduce(
      (a, b) => {
        return {
          refinementCount: <u32>(a.refinementCount + b.refinementCount),
          refinementGasUsed: <Gas>(a.refinementGasUsed + b.refinementGasUsed),
          importCount: <u32>(a.importCount + b.importCount),
          extrinsicCount: <u32>(a.extrinsicCount + b.extrinsicCount),
          extrinsicSize: <u32>(a.extrinsicSize + b.extrinsicSize),
          exportCount: <u32>(a.exportCount + b.exportCount),
        };
      },
      {
        refinementCount: <u32>0,
        refinementGasUsed: <Gas>0n,
        importCount: <u32>0,
        extrinsicCount: <u32>0,
        extrinsicSize: <u32>0,
        exportCount: <u32>0,
      },
    );
};
