import { Hash, RingVRFProof } from "@/genericTypes.js";

/**
 * identified by `C` set
 */
export type Ticket = {
  /**
   * `y
   */
  identifier: Hash;
  /**
   * `r`
   */
  entryIndex: 0 | 1;
};
