import {
  CORES,
  newSTF,
  SeqOfLength,
  u32,
  Dagger,
  Hash,
  toDagger,
  toTagged,
} from "@vekexasia/jam-types";
import { WorkReport } from "@/type";
import assert from "node:assert";

/**
 * `ρ`
 * (118)
 */
export type RHO = SeqOfLength<
  { workReport: WorkReport; reportTime: u32 } | null,
  typeof CORES
>;
