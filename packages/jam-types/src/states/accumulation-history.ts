import { EPOCH_LENGTH } from "@tsjam/constants";
import { SeqOfLength, WorkPackageHash } from "@/generic-types";

/**
 * `ξ` in the graypaper
 * Defines the wph that have been accumulated
 * $(0.7.1 - 12.1)
 */
export type AccumulationHistory = {
  elements: SeqOfLength<Set<WorkPackageHash>, typeof EPOCH_LENGTH>;
};
