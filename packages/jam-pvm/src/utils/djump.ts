import { EvaluationContext, u32 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { RegularPVMExitReason } from "@/exitReason.js";
const ZA = 4;
/**
 * djump(a) method defined in `227`
 * @param context - the current evaluating context
 * @param a - the address to jump to
 */
export const djump = (
  context: EvaluationContext,
  a: u32,
): ReturnType<GenericPVMInstruction<never>["evaluate"]> => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return { exitReason: RegularPVMExitReason.Halt };
  } else if (
    a === 0 ||
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return { exitReason: RegularPVMExitReason.Panic };
  }

  return {
    nextInstructionPointer: (context.program.j[Math.floor(a / ZA)] - 1) as u32,
  };
};
