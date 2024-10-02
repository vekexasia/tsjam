import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@vekexasia/jam-constants";
import { Tau } from "@/Tau.js";

/**
 * `ρ`
 * (116)
 */
export type RHO = SeqOfLength<
  {
    /**
     * `w`
     */
    workReport: WorkReport;
    /**
     * `t`
     */
    reportTime: Tau;
  } | null,
  typeof CORES
>;
