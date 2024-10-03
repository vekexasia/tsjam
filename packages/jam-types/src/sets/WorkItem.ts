import { Hash, ServiceIndex, UpToSeq, u32, u64 } from "@/genericTypes";
import { MAX_WORKPACKAGE_ENTRIES } from "@vekexasia/jam-constants";

/**
 * Identified by `I` set
 * @see section 14.3
 * @see formula (175)
 */
export interface WorkItem {
  /**
   * `s` - the service related to the work item
   */
  serviceIndex: ServiceIndex;

  /**
   * `c` - the code hash of the service a time of the work item creation
   */
  codeHash: Hash;

  /**
   * `y` - the payload of the work item
   */
  payload: Uint8Array;

  /**
   * `g`
   */
  gasLimit: u64;

  /**
   * `i`
   */
  importedDataSegments: Array<{
    /**
     * merkle tree root
     */
    root: Hash;
    /**
     * index in the merkle tree
     */
    index: u32;
  }>;

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
