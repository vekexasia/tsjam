import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import {
  PVMExitReasonMod,
  PVMIxEvaluateFNContext,
  PVMSingleModPointer,
  u32,
} from "@tsjam/types";
import { IxMod } from "../instructions/utils";

const ZA = 2;
/**
 * djump(a)
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.7.1 - A.18)
 */
export const djump = (
  context: PVMIxEvaluateFNContext,
  a: u32,
): Array<
  | PVMSingleModPointer
  | PVMSingleModPointer
  | PVMExitReasonMod<PVMExitReasonImpl>
> => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return [IxMod.ip(context.execution.instructionPointer), IxMod.halt()];
  } else if (
    a === 0 ||
    a > context.program.rawProgram.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO: check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
  }

  return [IxMod.ip(context.program.rawProgram.j[a / ZA - 1])];
};
