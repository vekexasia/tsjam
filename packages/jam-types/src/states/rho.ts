import { SeqOfLength, u32 } from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@/consts";

/**
 * `ρ`
 * (116)
 */
export type RHO = SeqOfLength<
  { workReport: WorkReport; reportTime: u32 } | null,
  typeof CORES
>;
