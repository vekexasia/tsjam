import { Hash, ServiceIndex, u32, u64 } from "@/genericTypes.js";

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
  importedDataSegments: Array<{
    root: Hash;
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
   */
  numberExportedSegments: u32;
}
