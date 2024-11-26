import { Tau } from "@/Tau";
import { Hash, WorkPackageHash } from "@/genericTypes";

/**
 * gives a snapshotof what was the situation when the work report was created
 * defined by `X` set
 * $(0.5.0 - 11.4)
 */
export type RefinementContext = {
  // first block of the snapshot
  anchor: {
    /**
     * `a` header hash
     */
    headerHash: Hash;
    /**
     * `s`
     */
    posteriorStateRoot: Hash;
    /**
     * `b`
     */
    posteriorBeefyRoot: Hash;
  };
  // second block of the snapshot
  lookupAnchor: {
    /**
     * `l`
     */
    headerHash: Hash;
    /**
     * `t`
     */
    timeSlot: Tau;
  };
  /**
   * `p`
   * it may define a required "parent" work package
   * some kind of dependency of the work package
   */
  requiredWorkPackage?: WorkPackageHash;
};
