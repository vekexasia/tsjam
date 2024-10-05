import { Hash, MerkeTreeRoot, UpToSeq, WorkPackageHash } from "@/genericTypes";
import { CORES } from "@tsjam/constants";

/*
 * @see section 7
 * (80)
 */

export interface RecentHistoryItem {
  /**
   * `h`
   */
  headerHash: Hash;
  /**
   * `s`
   */
  stateRoot: MerkeTreeRoot;
  /**
   * `b`
   */
  accumulationResultMMR: Array<Hash | undefined>;
  /**
   * `p` the hash of each work report that made into the block. there is no more than the number of
   * cores C which is 341
   */
  reportedPackages: UpToSeq<WorkPackageHash, typeof CORES>;
}

/**
 * maxLength is H which is the size of the recent history
 * H = 8
 * @see section 7
 * they're ordered so that entry 0 is the most recent
 */
export type RecentHistory = UpToSeq<RecentHistoryItem, 8>;
