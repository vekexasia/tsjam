import { EPOCH_LENGTH } from "@tsjam/constants";
import { Hash, SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `ξ` in the graypaper
 * (158) Section 12.2
 */
export type AccumulationHistory = SeqOfLength<
  Map<WorkPackageHash, Hash>,
  typeof EPOCH_LENGTH
>;
