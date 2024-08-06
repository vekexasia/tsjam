import { Hash, ServiceIndex } from "@/genericTypes.js";
import { RefinementContext } from "@/ReportingAndAvailabilityState.js";
import { BoundedSeq, MAXIMUM_WORK_ITEMS } from "@/index.js";
import { WorkItem } from "@/workItem.js";

/**
 * Identified by `P` set
 * @see section 14.3
 * @see formula (176)
 */
export interface WorkPackage {
  /**
   * `j`
   */
  authorizationToken: Uint8Array;
  /**
   * `h`
   */
  serviceIndex: ServiceIndex;
  /**
   * `c`
   */
  authorizationCodeHash: Hash;
  /**
   * `p`
   */
  parametrizationBlob: Uint8Array;
  /**
   * `x`
   */
  context: RefinementContext;
  /**
   * `i`
   */
  workItems: BoundedSeq<WorkItem, 1, typeof MAXIMUM_WORK_ITEMS>;
}
