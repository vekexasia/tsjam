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
     * `bold w` calculated in $(0.6.4 - 11.28)
     */
    guaranteedReports: WorkReport[];
    preimages: EP_Extrinsic;

    /**
     * `bold X` - from $(0.6.4 - 12.29)
     */
    transferStatistics: Map<ServiceIndex, { count: u32; usedGas: Gas }>;

    /**
     * `bold I` - from $(0.6.4 - 12.23)
     */
    accumulationStatistics: Map<ServiceIndex, { count: u32; usedGas: Gas }>;
  },
  never
> = (input) => {
  const toRet: JamStatistics["services"] = new Map();
  // $(0.6.4 - 13.14)
  const bold_p = new Set(input.preimages.map((p) => p.serviceIndex));

  // $(0.6.4 - 13.13)
  const bold_r = new Set(
    input.guaranteedReports
      .map((r) => r.results)
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
        usedGas: <Gas>0n,
      },
      transfers: input.transferStatistics.get(service) ?? {
        count: <u32>0,
        usedGas: <Gas>0n,
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
  "imports" | "exports" | "extrinsicSize" | "extrinsicCount" | "refinement"
> => {
  return guaranteedReports
    .map((report) => report.results)
    .flat()
    .filter((result) => result.serviceIndex === service)
    .map((result) => ({
      imports: result.refineLoad.imports,
      exports: result.refineLoad.exports,
      extrinsicSize: result.refineLoad.extrinsicSize,
      extrinsicCount: result.refineLoad.extrinsicCount,
      refinement: { count: <u32>1, usedGas: result.refineLoad.usedGas },
    }))
    .reduce(
      (a, b) => {
        return {
          imports: <u32>(a.imports + b.imports),
          exports: <u32>(a.exports + b.exports),
          extrinsicSize: <u32>(a.extrinsicSize + b.extrinsicSize),
          extrinsicCount: <u32>(a.extrinsicCount + b.extrinsicCount),
          refinement: {
            count: <u32>(a.refinement.count + b.refinement.count),
            usedGas: <Gas>(a.refinement.usedGas + b.refinement.usedGas),
          },
        };
      },
      {
        imports: <u32>0,
        exports: <u32>0,
        extrinsicSize: <u32>0,
        extrinsicCount: <u32>0,
        refinement: {
          count: <u32>0,
          usedGas: <Gas>0n,
        },
      },
    );
};
