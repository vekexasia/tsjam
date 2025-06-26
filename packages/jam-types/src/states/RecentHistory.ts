import {
  Hash,
  HeaderHash,
  StateRootHash,
  UpToSeq,
  WorkPackageHash,
} from "@/genericTypes";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";

/*
 * @see section 7
 */
export interface RecentHistoryItem {
  /**
   * `h`
   */
  headerHash: HeaderHash;

  /**
   * `s`
   */
  stateRoot: StateRootHash;

  /**
   * `b`
   */
  accumulationResultMMB: Hash;

  /**
   * `p`
   *  dictionary from workpackagehash to erasureroot
   */
  reportedPackages: Map<WorkPackageHash, Hash>;
}

/**
 * $(0.7.0 - 7.2)
 */
export type RecentHistory = UpToSeq<
  RecentHistoryItem,
  typeof RECENT_HISTORY_LENGTH
>;
/**
 * @see section 7
 * they're ordered so that entry 0 is the most recent
 * $(0.6.7 - 7.1 / 7.3)
 */
export type Beta = {
  /**
   * `h`
   */
  recentHistory: RecentHistory;

  /**
   * `b`
   */
  beefyBelt: Array<Hash | undefined>;
};
