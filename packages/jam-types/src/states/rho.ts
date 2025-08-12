import { SeqOfLength } from "@/generic-types";
import { WorkReport } from "@/sets/work-report";
import { Slot } from "@/slot";
import { CORES } from "@tsjam/constants";

/**
 * `ρ` - tracks WorkReports which have been reported but not
 *       yet available indexed by core index
 * $(0.7.1 - 11.1)
 */
export type RHO = {
  elements: SeqOfLength<RHOElement | undefined, typeof CORES>;
};

export type RHOElement = {
  /** `bold_r`
   */
  workReport: WorkReport;
  /**
   * `t`
   */
  reportSlot: Slot;
};
