import { EPOCH_LENGTH } from "@tsjam/constants";
import { Hash, SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `ξ` in the graypaper
 * $(0.5.0 - 12.1)
 */
export type AccumulationHistory = SeqOfLength<
  Set<WorkPackageHash>,
  typeof EPOCH_LENGTH
>;
