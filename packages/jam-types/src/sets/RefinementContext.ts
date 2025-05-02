import { Tau } from "@/Tau";
import {
  BeefyRootHash,
  HeaderHash,
  StateRootHash,
  WorkPackageHash,
} from "@/genericTypes";

/**
 * gives a snapshotof what was the situation when the work report was created
 * defined by `X` set
 * $(0.6.4 - 11.4)
 */
export type RefinementContext = {
  // first block of the snapshot
  anchor: {
    /**
     * `a` header hash
     */
    hash: HeaderHash;
    /**
     * `s`
     */
    stateRoot: StateRootHash;
    /**
     * `b`
     */
    beefyRoot: BeefyRootHash;
  };
  // second block of the snapshot
  lookupAnchor: {
    /**
     * `l`
     */
    hash: HeaderHash;
    /**
     * `t`
     */
    timeSlot: Tau;
  };
  /**
   * `p`
   * it may define a list of WorkPackages that need to be "computed"
   * before the current one
   */
  dependencies: WorkPackageHash[];
};
