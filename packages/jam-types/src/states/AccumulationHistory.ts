import { EPOCH_LENGTH } from "@tsjam/constants";
import { Hash, SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `ξ` in the graypaper
 * (162) Section 12.2
 */
export type AccumulationHistory = SeqOfLength<
  Set<WorkPackageHash>,
  typeof EPOCH_LENGTH
>;
