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
     * `bold W` calculated in $(0.7.0 - 11.16)
     */
    availableReports: AvailableWorkReports;

    /**
     * `bold I` calculated in $(0.7.0 - 11.28)
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
 * $(0.6.4 - 13.9)
 */
const R_fn = (
  core: CoreIndex,
  guaranteedReports: WorkReport[],
): Omit<JamStatistics["cores"][0], "popularity" | "daLoad"> => {
  const filteredReports = guaranteedReports.filter((w) => w.core === core);

  const accumulator = {
    importCount: <u16>0,
    exportCount: <u16>0,
    extrinsicSize: <u32>0,
    extrinsicCount: <u16>0,
    gasUsed: <Gas>0n,
    bundleSize: <u32>0,
  };
  for (const { digests, avSpec } of filteredReports) {
    accumulator.bundleSize = <u32>(
      (accumulator.bundleSize + avSpec.bundleLength)
    );
    for (const result of digests) {
      accumulator.importCount = <u16>(
        (accumulator.importCount + result.refineLoad.importCount)
      );
      accumulator.exportCount = <u16>(
        (accumulator.exportCount + result.refineLoad.exportCount)
      );
      accumulator.extrinsicSize = <u32>(
        (accumulator.extrinsicSize + result.refineLoad.extrinsicSize)
      );
      accumulator.extrinsicCount = <u16>(
        (accumulator.extrinsicCount + result.refineLoad.extrinsicCount)
      );
      accumulator.gasUsed = <Gas>(
        (accumulator.gasUsed + result.refineLoad.gasUsed)
      );
    }
  }
  return accumulator;
};
