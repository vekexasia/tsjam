import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  E_int,
  jsonCodec,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { CORES, ERASURECODE_SEGMENT_SIZE } from "@tsjam/constants";
import {
  CoreIndex,
  CoreStatistics,
  Dagger,
  Gas,
  SeqOfLength,
  SingleCoreStatistics,
  u16,
  u32,
  Validated,
  WorkReport,
  Tagged,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { AssurancesExtrinsicImpl } from "./extrinsics/assurances";
import { RHOImpl } from "./RHOImpl";
import { SingleCoreStatisticsImpl } from "./SingleCoreStatisticsImpl";
import { SingleServiceStatisticsImpl } from "./SingleServiceStatisticsImpl";
import { AvailableWorkReports, WorkReportImpl } from "./WorkReportImpl";

export class CoreStatisticsImpl
  extends BaseJamCodecable
  implements CoreStatistics
{
  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "record" },
      NumberJSONCodec(),
      SingleServiceStatisticsImpl,
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(
      E_int(),
      SingleServiceStatisticsImpl,
      (a, b) => a - b,
    ),
  )
  elements!: SeqOfLength<SingleCoreStatisticsImpl, typeof CORES>;

  constructor(config: ConditionalExcept<CoreStatisticsImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  toPosterior(deps: {
    ea: Validated<AssurancesExtrinsicImpl>;
    d_rho: Dagger<RHOImpl>;
    bold_I: Tagged<WorkReportImpl[], "bold I">;
    bold_R: AvailableWorkReports;
  }) {
    const toRet = structuredClone(this);

    for (let c = <CoreIndex>0; c < CORES; c++) {
      toRet.elements[c] = new SingleCoreStatisticsImpl({
        ...R_fn(<CoreIndex>c, deps.bold_I),
        daLoad: D_fn(<CoreIndex>c, deps.bold_R),
        popularity: <u16>deps.ea.nPositiveVotes(c),
        // $(0.7.0 - 13.10) - L
        bundleSize: <u32>deps.bold_I
          .filter((w) => w.core === c)
          .map((w) => w.avSpec.bundleLength)
          .reduce((a, b) => a + b, 0),
      });
    }

    return toPosterior(toRet);
  }
}

/**
 * $(0.7.0 - 13.11)
 */
const D_fn = (
  core: CoreIndex,
  /**
   * `bold R`
   * $(0.7.0 - 11.16)
   */
  availableReports: AvailableWorkReports,
): u32 => {
  return <u32>availableReports
    .filter((w) => w.core === core)
    .map((w) => {
      return (
        w.avSpec.bundleLength +
        ERASURECODE_SEGMENT_SIZE * Math.ceil((w.avSpec.segmentCount * 65) / 64)
      );
    })
    .reduce((a, b) => a + b, 0);
};

/**
 * $(0.7.0 - 13.9)
 */
const R_fn = (
  core: CoreIndex,
  /**
   * `bold I`
   * @see $(0.7.0 - 11.28)
   */
  guaranteedReports: WorkReport[],
): Omit<SingleCoreStatistics, "popularity" | "daLoad" | "bundleSize"> => {
  const filteredReports = guaranteedReports.filter((w) => w.core === core);

  const accumulator = {
    importCount: <u16>0,
    exportCount: <u16>0,
    extrinsicSize: <u32>0,
    extrinsicCount: <u16>0,
    gasUsed: <Gas>0n,
  };
  for (const { digests } of filteredReports) {
    for (const digest of digests) {
      accumulator.importCount = <u16>(
        (accumulator.importCount + digest.refineLoad.importCount)
      );
      accumulator.exportCount = <u16>(
        (accumulator.exportCount + digest.refineLoad.exportCount)
      );
      accumulator.extrinsicSize = <u32>(
        (accumulator.extrinsicSize + digest.refineLoad.extrinsicSize)
      );
      accumulator.extrinsicCount = <u16>(
        (accumulator.extrinsicCount + digest.refineLoad.extrinsicCount)
      );
      accumulator.gasUsed = <Gas>(
        (accumulator.gasUsed + digest.refineLoad.gasUsed)
      );
    }
  }
  return accumulator;
};
