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
     * `bold R` calculated in $(0.7.0 - 11.16)
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
      // $(0.7.0 - 13.10) - L
      bundleSize: <u32>input.guaranteedReports
        .filter((w) => w.core === c)
        .map((w) => w.avSpec.bundleLength)
        .reduce((a, b) => a + b, 0),
    };
  }
  return ok(toPosterior(toRet));
};

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
): Omit<JamStatistics["cores"][0], "popularity" | "daLoad" | "bundleSize"> => {
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
