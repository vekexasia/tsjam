import { u32 } from "@vekexasia/jam-types";
import { PVMExitReason } from "@/exitReason.js";
import { EvaluationContext } from "@/evaluationContext.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface GenericPVMInstruction<Args extends unknown[]> {
  /**
   * decode the full instruction from the bytes.
   * the byte array is chunked to include only the bytes of the instruction (included opcode)
   * @param bytes
   */
  decode(bytes: Uint8Array): Args;

  evaluate(
    context: EvaluationContext,
    ...args: Args
  ): {
    exitReason?: PVMExitReason;
    nextInstructionPointer?: u32;
  } | void;
}

export type EvaluateFunction<Args extends unknown[]> =
  GenericPVMInstruction<Args>["evaluate"];
