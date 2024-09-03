import { BoundedSeq, Hash, ServiceIndex } from "@/genericTypes";
import { RefinementContext } from "@/sets/RefinementContext";
import { WorkItem } from "@/sets/WorkItem";
import { MAXIMUM_WORK_ITEMS } from "@/consts";

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
