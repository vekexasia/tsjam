import { SeqOfLength } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@vekexasia/jam-constants";
import { Tau } from "@/tau.js";

/**
 * `ρ`
 * (116)
 */
export type RHO = SeqOfLength<
  { workReport: WorkReport; reportTime: Tau } | null,
  typeof CORES
>;
