import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@tsjam/constants";
import { Tau } from "@/Tau.js";

/**
 * `ρ`
 * $(0.5.3 - 11.1)
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
