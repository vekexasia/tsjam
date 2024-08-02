import { u32, u8 } from "@vekexasia/jam-types";
import { PVMExitReason } from "@/exitReason.js";
import { EvaluationContext } from "@/evaluationContext.js";

export interface GenericPVMInstruction<Args extends unknown[]> {
  /**
   * the identifier of the instruction
   */
  readonly identifier: u8;
  /**
   * the human readable name of the instruction
   */
  readonly name: string;

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
