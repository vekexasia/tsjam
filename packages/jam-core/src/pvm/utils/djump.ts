import {
  PVMSingleModPointer,
  u32,
  PVMIxEvaluateFNContext,
  PVMExitReasonMod,
} from "@tsjam/types";
import { IxMod } from "../instructions/utils";
import { PVMExitReasonImpl } from "@/impls";

const ZA = 2;
/**
 * djump(a)
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.6.4 - A.18)
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
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO: check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
  }

  return [IxMod.ip(context.program.j[a / ZA - 1])];
};
