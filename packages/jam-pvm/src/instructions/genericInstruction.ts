import { u32, u8 } from "@vekexasia/jam-types";
import { PVMExitReason } from "@/exitReason.js";
import { EvaluationContext } from "@/evaluationContext.js";

export interface GenericPVMInstruction<Arg1 = unknown, Arg2 = unknown> {
  /**
   * the identifier of the instruction
   */
  readonly identifier: u8;
  /**
   * the human readable name of the instruction
   */
  readonly name: string;

  decode(
    context: EvaluationContext,
    data: Uint8Array,
    offset: u32,
  ): { args: [Arg1, Arg2]; nextOffset: u32 };

  evaluate(
    context: EvaluationContext,
    a1: Arg1,
    a2: Arg2,
  ): {
    exitReason?: PVMExitReason;
    nextInstructionPointer?: u32;
  };
}
