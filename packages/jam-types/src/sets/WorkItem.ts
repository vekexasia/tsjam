import {
  Gas,
  Hash,
  ServiceIndex,
  u32,
  ExportingWorkPackageHash,
  u16,
} from "@/genericTypes";

/**
 * Identified by `I` set
 * @see section 14.3
 * $(0.5.4 - 14.3 / 14.4)
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
  refinementGasLimit: Gas;

  /**
   * `a`
   */
  accumulationGasLimit: Gas;

  /**
   * `e`
   * - should be &lt; 2^11
   */
  numberExportedSegments: u32;

  /**
   * `i`
   */
  importedDataSegments: Array<{
    /**
     * merkle tree root
     * or hash of the exporting work package. (if tagged)
     */
    root: Hash | ExportingWorkPackageHash;
    /**
     * index in the merkle tree
     * Codec specifies that its not bigger than 2^15
     */
    index: u16;
  }>;

  /**
   * `x`
   */
  exportedDataSegments: Array<{
    blobHash: Hash;
    length: u32;
  }>;
}
