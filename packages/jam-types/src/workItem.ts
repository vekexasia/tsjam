import { Hash, ServiceIndex, u32, u64, UpToSeq } from "@/genericTypes.js";
import { MAX_WORKPACKAGE_ENTRIES } from "@/consts.js";

/**
 * Identified by `I` set
 * @see section 14.3
 * @see formula (176)
 */
export interface WorkItem {
  /**
   * `s`
   */
  serviceIndex: ServiceIndex;

  /**
   * `c`
   */
  codeHash: Hash;

  /**
   * `y`
   */
  payload: Uint8Array;

  /**
   * `g`
   */
  gasLimit: u64;

  /**
   * `i`
   */
  importedDataSegments: UpToSeq<
    {
      /**
       * merkle tree root
       */
      root: Hash;
      /**
       * index in the merkle tree
       */
      index: u32;
    },
    typeof MAX_WORKPACKAGE_ENTRIES
  >;

  /**
   * `x`
   */
  exportedDataSegments: Array<{
    blobHash: Hash;
    length: u32;
  }>;

  /**
   * `e`
   * - should be < 2^11
   */
  numberExportedSegments: u32;
}
