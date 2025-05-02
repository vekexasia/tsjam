import { WorkOutput } from "@/sets/WorkOutput.js";
import { Hash, WorkPackageHash } from "@/genericTypes.js";

/**
 * `O` set in graypaper
 * $(0.6.4 - 12.18)
 */
export type PVMAccumulationOp = {
  /**
   * `h`
   */
  workPackageHash: WorkPackageHash;

  /**
   * `e`
   */
  segmentRoot: Hash;

  /**
   * `a`
   */
  authorizerHash: Hash;

  /**
   * `o` - comes from Workreport
   */
  authorizerOutput: Uint8Array;

  /**
   * `y`
   */
  payloadHash: Hash;

  /**
   * `d`
   */
  output: WorkOutput;
};
