import {
  Authorization,
  AuthorizationParams,
  BoundedSeq,
  CodeHash,
  ServiceIndex,
} from "@/generic-types";
import { WorkContext } from "@/sets/work-context";
import { WorkItem } from "@/sets/work-item";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";

/**
 * Identified by `P` set
 * @see section 14.3
 * $(0.7.1 - 14.2)
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
