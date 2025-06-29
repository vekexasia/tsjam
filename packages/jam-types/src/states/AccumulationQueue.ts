import { EPOCH_LENGTH } from "@tsjam/constants";
import { WorkReport } from "@/sets/WorkReport";
import { SeqOfLength, WorkPackageHash } from "@/genericTypes";

/**
 * `v` in the graypaper
 * Defines the ready but not yet accumulated work reports
 * $(0.6.4 - 12.3)
 */
export type AccumulationQueue = SeqOfLength<
  Array<{
    /**
     * `bold_r`
     */
    workReport: WorkReport;

    /**
     * `bold_d`
     */
    dependencies: Set<WorkPackageHash>;
  }>,
  typeof EPOCH_LENGTH
>;
