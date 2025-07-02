import {
  Authorization,
  AuthorizationParams,
  Blake2bHash,
  BoundedSeq,
  CodeHash,
  ServiceIndex,
} from "@/genericTypes";
import { PVMProgramCode } from "@/pvm/PVMProgramCode";
import { WorkContext } from "@/sets/WorkContext";
import { WorkItem } from "@/sets/WorkItem";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";

/**
 * Identified by `P` set
 * @see section 14.3
 * $(0.7.0 - 14.2)
 */
export interface WorkPackage {
  /**
   * `j`
   */
  authToken: Authorization;
  /**
   * `h` - index of the service that hosts the authorization code
   */
  authCodeHost: ServiceIndex;
  /**
   * `u` - authorization code hash
   */
  authCodeHash: CodeHash;
  /**
   * `bold f` - configuration blob
   */
  authConfig: AuthorizationParams;
  /**
   * `bold c` - context
   */
  context: WorkContext;
  /**
   * `bold w` - sequence of work items
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
  readonly pc: PVMProgramCode;
}
