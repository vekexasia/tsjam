import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContext, u32 } from "@tsjam/types";

const ZA = 2;
/**
 * djump(a)
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.7.1 - A.18)
 */
export const djump = (
  a: u32,
  context: PVMIxEvaluateFNContext,
): PVMExitReasonImpl | void => {
  // first branch of djump(a)
  const newIP = context.program.rawProgram.j[a / ZA - 1];
  if (a == 2 ** 32 - 2 ** 16) {
    return PVMExitReasonImpl.halt();
  } else if (
    a === 0 ||
    a > context.program.rawProgram.j.length * ZA ||
    a % ZA != 0 ||
    typeof newIP === "undefined" ||
    !context.program.isBlockBeginning(newIP)
  ) {
    return PVMExitReasonImpl.panic();
  }
  context.execution.instructionPointer = newIP;
};
