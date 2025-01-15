import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@tsjam/constants";
import { Tau } from "@/Tau.js";

/**
 * `ρ` - tracks WorkReports which have been reported but not
 *       yet available indexed by core index
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
