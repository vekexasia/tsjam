import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@tsjam/constants";
import { Tau } from "@/Tau.js";

/**
 * `ρ` - tracks WorkReports which have been reported but not
 *       yet available indexed by core index
 * $(0.7.0 - 11.1)
 */
export type RHO = SeqOfLength<
  | {
      /** `bold_r`
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
