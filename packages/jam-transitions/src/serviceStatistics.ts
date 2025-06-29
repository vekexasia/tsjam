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
 * $(0.6.4 - 13.11)
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
     * `bold X` - from $(0.6.4 - 12.29)
     */
    transferStatistics: Map<ServiceIndex, { count: u32; gasUsed: Gas }>;

    /**
     * `bold I` - from $(0.6.4 - 12.23)
     */
    accumulationStatistics: Map<ServiceIndex, { count: u32; gasUsed: Gas }>;
  },
  never
> = (input) => {
  const toRet: JamStatistics["services"] = new Map();
  // $(0.6.4 - 13.14)
  const bold_p = new Set(input.preimages.map((p) => p.serviceIndex));

  // $(0.6.4 - 13.13)
  const bold_r = new Set(
    input.guaranteedReports
      .map((r) => r.digests)
      .flat()
      .map((res) => res.serviceIndex),
  );

  const bold_s = new Set([
    ...bold_p,
    ...bold_r,
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
 * $(0.6.4 - 13.15)
 */
const R_fn = (
  service: ServiceIndex,
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
      importCount: result.refineLoad.importCount,
      exportCount: result.refineLoad.exportCount,
      extrinsicSize: result.refineLoad.extrinsicSize,
      extrinsicCount: result.refineLoad.extrinsicCount,
      refinement: { count: <u32>1, gasUsed: result.refineLoad.gasUsed },
    }))
    .reduce(
      (a, b) => {
        return {
          importCount: <u32>(a.importCount + b.importCount),
          exportCount: <u32>(a.exportCount + b.exportCount),
          extrinsicSize: <u32>(a.extrinsicSize + b.extrinsicSize),
          extrinsicCount: <u32>(a.extrinsicCount + b.extrinsicCount),
          refinement: {
            count: <u32>(a.refinement.count + b.refinement.count),
            gasUsed: <Gas>(a.refinement.gasUsed + b.refinement.gasUsed),
          },
        };
      },
      {
        importCount: <u32>0,
        exportCount: <u32>0,
        extrinsicSize: <u32>0,
        extrinsicCount: <u32>0,
        refinement: {
          count: <u32>0,
          gasUsed: <Gas>0n,
        },
      },
    );
};
