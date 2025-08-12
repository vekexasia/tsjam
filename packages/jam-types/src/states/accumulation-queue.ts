import { EPOCH_LENGTH } from "@tsjam/constants";
import { WorkReport } from "@/sets/work-report";
import { SeqOfLength, WorkPackageHash } from "@/generic-types";

/**
 * `ω`
 * Defines the ready but not yet accumulated work reports
 * $(0.7.1 - 12.3)
 */
export type AccumulationQueue = {
  elements: SeqOfLength<
    Array<{
      /**
       * `bold_r`
       */
      workReport: WorkReport;

      /**
       * `bold_d`
       * the unaccumulated dependencies of the workreport
       */
      dependencies: Set<WorkPackageHash>;
    }>,
    typeof EPOCH_LENGTH
  >;
};
