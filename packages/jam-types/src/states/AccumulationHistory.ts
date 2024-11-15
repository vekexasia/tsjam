import { EPOCH_LENGTH } from "@tsjam/constants";
import { Hash, SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `ξ` in the graypaper
 * (12.1 - 0.5.0)
 */
export type AccumulationHistory = SeqOfLength<
  Set<WorkPackageHash>,
  typeof EPOCH_LENGTH
>;
