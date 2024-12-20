import { Blake2bHash, BoundedSeq, Hash, ServiceIndex } from "@/genericTypes";
import { RefinementContext } from "@/sets/RefinementContext";
import { WorkItem } from "@/sets/WorkItem";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";

/**
 * Identified by `P` set
 * @see section 14.3
 * $(0.5.3 - 14.2)
 */
export interface WorkPackage {
  /**
   * `j`
   */
  authorizationToken: Uint8Array;
  /**
   * `h` - index of the service that hosts the authorization code
   */
  serviceIndex: ServiceIndex;
  /**
   * `u` - authorization code hash
   */
  authorizationCodeHash: Hash;
  /**
   * `p` - parametrization blob
   */
  parametrizationBlob: Uint8Array;
  /**
   * `x` - context
   */
  context: RefinementContext;
  /**
   * `w` - sequence of work items
   */
  workItems: BoundedSeq<WorkItem, 1, typeof MAXIMUM_WORK_ITEMS>;
}

/**
 * WorkPackage augmented with some computed fields
 */
export interface WorkPackageWithAuth extends WorkPackage {
  /**
   * `a` - public key of the authorizer
   * Hash(pc ^ parametrizationBlob)
   */
  readonly pa: Blake2bHash;
  /**
   * `c` - the authorization code
   * historicalLookup(delta(serviceIndex), context.lookupAnchor.timeSlot, authorizationCodeHash)
   */
  readonly pc: Uint8Array;
}
