import { toPosterior } from "@tsjam/utils";
import {
  EP_Extrinsic,
  Gas,
  JamStatistics,
  ServiceIndex,
  SingleServiceStatistics,
  STF,
  u16,
  u32,
  WorkReport,
} from "@vekexasia/jam-types";
import { ok } from "neverthrow";

/**
 * $(0.7.0 - 13.12)
 */
export const serviceStatisticsSTF: STF<
  JamStatistics["services"],
  {
    /**
     * `bold I` calculated in $(0.7.0 - 11.28)
     */
    guaranteedReports: WorkReport[];
    preimages: EP_Extrinsic;

    /**
     * `bold X` - from $(0.7.0 - 12.33)
     */
    transferStatistics: Map<ServiceIndex, { count: u32; gasUsed: Gas }>;

    /**
     * `bold S` - from $(0.7.0 - 12.26)
     */
    accumulationStatistics: Map<ServiceIndex, { count: u32; gasUsed: Gas }>;
  },
  never
> = (input) => {
  const toRet: JamStatistics["services"] = new Map();

  // $(0.7.0 - 13.13)
  const s_r = new Set(
    input.guaranteedReports
      .map((r) => r.digests)
      .flat()
      .map((res) => res.serviceIndex),
  );

  // $(0.7.0 - 13.14)
  const s_p = new Set(input.preimages.map((p) => p.serviceIndex));

  const bold_s = new Set([
    ...s_p,
    ...s_r,
    ...input.accumulationStatistics.keys(),
    ...input.transferStatistics.keys(),
  ]);

  for (const service of bold_s) {
    toRet.set(service, {
      ...R_fn(service, input.guaranteedReports),
      provided: input.preimages
        .filter(({ serviceIndex }) => serviceIndex === service)
        .map(({ preimage }) => ({ count: <u16>1, size: <u32>preimage.length }))
        .reduce(
          (a, b) => ({
            count: <u16>(a.count + b.count),
            size: <u32>(a.size + b.size),
          }),
          { count: <u16>0, size: <u32>0 },
        ),

      accumulate: input.accumulationStatistics.get(service) ?? {
        count: <u32>0,
        gasUsed: <Gas>0n,
      },
      transfers: input.transferStatistics.get(service) ?? {
        count: <u32>0,
        gasUsed: <Gas>0n,
      },
    });
  }

  return ok(toPosterior(toRet));
};

/**
 * $(0.7.0 - 13.16)
 */
const R_fn = (
  service: ServiceIndex,
  /**
   * `bold I`
   */
  guaranteedReports: WorkReport[],
): Pick<
  SingleServiceStatistics,
  | "importCount"
  | "exportCount"
  | "extrinsicSize"
  | "extrinsicCount"
  | "refinement"
> => {
  return guaranteedReports
    .map((report) => report.digests)
    .flat()
    .filter((result) => result.serviceIndex === service)
    .map((result) => ({
      refinement: { count: <u32>1, gasUsed: result.refineLoad.gasUsed },
      importCount: result.refineLoad.importCount,
      extrinsicCount: result.refineLoad.extrinsicCount,
      extrinsicSize: result.refineLoad.extrinsicSize,
      exportCount: result.refineLoad.exportCount,
    }))
    .reduce(
      (a, b) => {
        return {
          refinement: {
            count: <u32>(a.refinement.count + b.refinement.count),
            gasUsed: <Gas>(a.refinement.gasUsed + b.refinement.gasUsed),
          },
          importCount: <u32>(a.importCount + b.importCount),
          extrinsicCount: <u32>(a.extrinsicCount + b.extrinsicCount),
          extrinsicSize: <u32>(a.extrinsicSize + b.extrinsicSize),
          exportCount: <u32>(a.exportCount + b.exportCount),
        };
      },
      {
        refinement: {
          count: <u32>0,
          gasUsed: <Gas>0n,
        },
        importCount: <u32>0,
        extrinsicCount: <u32>0,
        extrinsicSize: <u32>0,
        exportCount: <u32>0,
      },
    );
};
