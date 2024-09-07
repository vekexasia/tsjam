import {
  PVMIx,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
  u32,
} from "@vekexasia/jam-types";
const ZA = 4;
/**
 * djump(a) method defined in `225`
 * @param context - the current evaluating context
 * @param a - the address to jump to
 */
export const djump = (
  context: Parameters<PVMIx<any>["evaluate"]>[0],
  a: u32,
): ReturnType<PVMIx<never>["evaluate"]> => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return {
      exitReason: RegularPVMExitReason.Halt,
      nextInstructionPointer: context.execution.instructionPointer,
    };
  } else if (
    a === 0 ||
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return {
      exitReason: RegularPVMExitReason.Panic,
      nextInstructionPointer: context.execution.instructionPointer,
    };
  }

  return {
    nextInstructionPointer: (context.program.j[Math.floor(a / ZA)] - 1) as u32,
  };
};
