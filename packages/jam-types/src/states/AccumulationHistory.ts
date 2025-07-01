import { EPOCH_LENGTH } from "@tsjam/constants";
import { SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `ξ` in the graypaper
 * Defines the wph that have been accumulated
 * $(0.7.0 - 12.1)
 */
export type AccumulationHistory = SeqOfLength<
  Set<WorkPackageHash>,
  typeof EPOCH_LENGTH
>;
