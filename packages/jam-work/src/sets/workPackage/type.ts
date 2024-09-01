import {
  BoundedSeq,
  Hash,
  MAXIMUM_WORK_ITEMS,
  ServiceIndex,
} from "@vekexasia/jam-types";
import { WorkItem } from "@/workItem.js";
import { RefinementContext } from "@/sets/index.js";

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
