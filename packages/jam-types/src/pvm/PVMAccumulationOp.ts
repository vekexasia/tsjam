import { WorkOutput } from "@/sets/WorkOutput.js";
import { Gas, Hash, WorkPackageHash } from "@/genericTypes.js";

/**
 * `I` set in graypaper $\operandtuple$
 * $(0.7.0 - 12.19)
 */
export type PVMAccumulationOp = {
  /**
   * `p`
   */
  packageHash: WorkPackageHash;

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
   * `bold_t` - comes from Workreport
   */
  authTrace: Uint8Array;

  /**
   * `bold_l`
   */
  result: WorkOutput;
};
