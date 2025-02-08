import { WorkOutput } from "@/sets/WorkOutput.js";
import { Hash } from "@/genericTypes.js";

/**
 * `O` set in graypaper
 * $(0.6.1 - 12.18)
 */
export type PVMAccumulationOp = {
  /**
   * `o`
   */
  output: WorkOutput;

  /**
   * `l`
   */
  payloadHash: Hash;

  /**
   * `k`
   */
  packageHash: Hash;

  /**
   * `a`
   */
  authorizationOutput: Uint8Array;
};
