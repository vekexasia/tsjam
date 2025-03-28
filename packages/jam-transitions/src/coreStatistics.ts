import { toPosterior } from "@tsjam/utils";
import { CORES, ERASURECODE_SEGMENT_SIZE } from "@tsjam/constants";
import {
  AvailableWorkReports,
  CoreIndex,
  EA_Extrinsic,
  Gas,
  JamStatistics,
  STF,
  u16,
  u32,
  WorkReport,
} from "@vekexasia/jam-types";
import { ok } from "neverthrow";

export const coreStatisticsSTF: STF<
  JamStatistics["cores"],
  {
    /**
     * `bold W` calculated in $(0.6.4 - 11.16)
     */
    availableReports: AvailableWorkReports;

    /**
     * `bold w` calculated in $(0.6.4 - 11.28)
     */
    guaranteedReports: WorkReport[];
    assurances: EA_Extrinsic;
  },
  never
> = (input) => {
  const toRet = [] as unknown as JamStatistics["cores"];
  for (let c = 0; c < CORES; c++) {
    toRet[c] = {
      ...R_fn(<CoreIndex>c, input.guaranteedReports),
      daLoad: D_fn(<CoreIndex>c, input.availableReports),
      popularity: <u16>(
        input.assurances
          .map((a) => <number>a.bitstring[c])
          .reduce((a, b) => a + b, 0)
      ),
    };
  }
  return ok(toPosterior(toRet));
};

const D_fn = (core: CoreIndex, availableReports: AvailableWorkReports): u32 => {
  return <u32>availableReports
    .filter((w) => w.coreIndex === core)
    .map((w) => {
      return (
        w.workPackageSpecification.bundleLength +
        ERASURECODE_SEGMENT_SIZE *
          Math.ceil((w.workPackageSpecification.segmentCount * 65) / 64)
      );
    })
    .reduce((a, b) => a + b, 0);
};

/**
 * $(0.6.4 - 13.9)
 */
const R_fn = (
  core: CoreIndex,
  guaranteedReports: WorkReport[],
): Omit<JamStatistics["cores"][0], "popularity" | "daLoad"> => {
  return guaranteedReports
    .filter((w) => w.coreIndex === core)
    .map(({ results, workPackageSpecification }) =>
      results.flat().map((r) => ({
        ...r.refineLoad,
        bundleSize: workPackageSpecification.bundleLength,
      })),
    )
    .flat()
    .reduce(
      (acc, curr) => {
        return {
          imports: <u16>(acc.imports + curr.imports),
          exports: <u16>(acc.exports + curr.exports),
          extrinsicSize: <u32>(acc.extrinsicSize + curr.extrinsicSize),
          extrinsicCount: <u16>(acc.extrinsicCount + curr.extrinsicCount),
          usedGas: <Gas>(acc.usedGas + curr.usedGas),
          bundleSize: <u32>(acc.bundleSize + curr.bundleSize),
        };
      },
      {
        imports: <u16>0,
        exports: <u16>0,
        extrinsicSize: <u32>0,
        extrinsicCount: <u16>0,
        usedGas: <Gas>0n,
        bundleSize: <u32>0,
      },
    );
};
