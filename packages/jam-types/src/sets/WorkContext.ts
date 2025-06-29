import { Tau } from "@/Tau";
import {
  BeefyRootHash,
  HeaderHash,
  StateRootHash,
  WorkPackageHash,
} from "@/genericTypes";

/**
 * gives a snapshotof what was the situation when the work report was created
 * defined by `C` set
 * $(0.7.0 - 11.4)
 */
export type WorkContext = {
  // first block of the snapshot
  anchor: {
    /**
     * `a` header hash
     */
    hash: HeaderHash;
    /**
     * `s`
     */
    postState: StateRootHash;
    /**
     * `b`
     */
    accOutLog: BeefyRootHash;
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
    time: Tau;
  };
  /**
   * `p`
   */
  prerequisites: WorkPackageHash[];
};
