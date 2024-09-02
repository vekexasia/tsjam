import { CORES, SeqOfLength, u32 } from "@vekexasia/jam-types";
import { WorkReport } from "@/sets/index.js";

/**
 * `ρ`
 * (116)
 */
export type RHO = SeqOfLength<
  { workReport: WorkReport; reportTime: u32 } | null,
  typeof CORES
>;
