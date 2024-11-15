import { EPOCH_LENGTH } from "@tsjam/constants";
import { WorkReport } from "@/sets/WorkReport";
import { SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `v` in the graypaper
 * (164) Section 12.2
 */
export type AccumulationQueue = SeqOfLength<
  Array<{ workReport: WorkReport; dependencies: Set<WorkPackageHash> }>,
  typeof EPOCH_LENGTH
>;
