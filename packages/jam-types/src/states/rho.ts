import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@tsjam/constants";
import { Tau } from "@/Tau.js";

/**
 * `ρ`
 * (116)
 */
export type RHO = SeqOfLength<
  | {
      /** `w`
       */
      workReport: WorkReport;
      /**
       * `t`
       */
      reportTime: Tau;
    }
  | undefined,
  typeof CORES
>;
