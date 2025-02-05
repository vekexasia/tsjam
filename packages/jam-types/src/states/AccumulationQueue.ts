import { EPOCH_LENGTH } from "@tsjam/constants";
import { WorkReport } from "@/sets/WorkReport";
import { SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `v` in the graypaper
 * $(0.6.1 - 12.3)
 */
export type AccumulationQueue = SeqOfLength<
  Array<{ workReport: WorkReport; dependencies: Set<WorkPackageHash> }>,
  typeof EPOCH_LENGTH
>;
