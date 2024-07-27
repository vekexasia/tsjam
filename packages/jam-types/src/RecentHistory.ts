import { Hash, UpToSeq } from "@/genericTypes.js";
/*
 * @see section 7
 */
export interface RecentHistoryItem {
  recentBlockHash: Hash;
  stateRoot: Hash;
  accumulationResultMMR: Array<Hash | null>;
  /**
   * the hash of each work report that made into the block. there is no more than the number of
   * cores C which is 341
   */
  workReports: UpToSeq<Hash, 341>;
}

/**
 * maxLength is H which is the size of the recent history
 * H = 8
 * @see section 7
 * they're ordered so that entry 0 is the most recent
 */
export type RecentHistory = UpToSeq<RecentHistoryItem, 8>;
