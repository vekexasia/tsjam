import { WorkOutput } from "@/sets/WorkOutput.js";
import { Gas, Hash, WorkPackageHash } from "@/genericTypes.js";

/**
 * `O` set in graypaper $\operandtuple$
 * $(0.6.7 - 12.19)
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
   * `y`
   */
  payloadHash: Hash;

  /**
   * `g`
   */
  gasLimit: Gas;

  /**
   * `d`
   * TODO: rename to result
   */
  output: WorkOutput;

  /**
   * `o` - comes from Workreport
   */
  authorizerOutput: Uint8Array;
};
