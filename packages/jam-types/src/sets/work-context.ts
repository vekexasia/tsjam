import { Slot } from "@/slot";
import {
  BeefyRootHash,
  HeaderHash,
  StateRootHash,
  WorkPackageHash,
} from "@/generic-types";

/**
 * gives a snapshotof what was the situation when the work report was created
 * defined by `C` set
 * $(0.7.1 - 11.4)
 */
export type WorkContext = {
  /**
   * `a` header hash
   */
  anchorHash: HeaderHash;
  /**
   * `s`
   */
  anchorPostState: StateRootHash;
  /**
   * `b`
   */
  anchorAccOutLog: BeefyRootHash;
  /**
   * `l`
   */
  lookupAnchorHash: HeaderHash;
  /**
   * `t`
   */
  lookupAnchorSlot: Slot;
  /**
   * `bold_p`
   */
  prerequisites: WorkPackageHash[];
};
