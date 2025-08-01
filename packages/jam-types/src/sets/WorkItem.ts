import {
  Gas,
  Hash,
  ServiceIndex,
  u32,
  ExportingWorkPackageHash,
  u16,
  WorkPayload,
  UpToSeq,
  CodeHash,
  MerkleTreeRoot,
} from "@/genericTypes";
import { MAX_IMPORTED_ITEMS } from "@tsjam/constants";

/**
 * Identified by `W` set
 * $(0.7.1 - 14.3)
 */
export interface WorkItem {
  /**
   * `s` - the service related to the work item
   */
  service: ServiceIndex;

  /**
   * `c` - the code hash of the service a time of the work item creation
   */
  codeHash: CodeHash;

  /**
   * `bold y` - the payload of the work item
   * Obfuscated/Opaque data fed in the refine logic that should contain info about the work that
   * needs to be done
   */
  payload: WorkPayload;

  /**
   * `g`
   * Gas Limit for the Refine logic
   */
  refineGasLimit: Gas;

  /**
   * `a`
   * Gas limit for the Accumulate logic
   */
  accumulateGasLimit: Gas;

  /**
   * `e`
   * - should be &lt; 2^11
   * Number of segments exported by the work item
   */
  exportCount: u16;

  /**
   * `bold i`
   * Sequence of imported Data Segments
   */
  importSegments: UpToSeq<
    {
      /**
       * merkle tree root
       * or hash of the exporting work package. (if tagged)
       */
      root: MerkleTreeRoot | ExportingWorkPackageHash;
      /**
       * index in the merkle tree
       * Codec specifies that its not bigger than 2^15
       */
      index: u16;
    },
    typeof MAX_IMPORTED_ITEMS
  >;

  /**
   * `x`
   * Blob hash and lengths to be introduced in the block.
   */
  exportedDataSegments: UpToSeq<
    {
      blobHash: Hash;
      length: u32;
    },
    typeof MAX_IMPORTED_ITEMS
  >;
}
