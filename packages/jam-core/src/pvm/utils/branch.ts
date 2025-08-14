import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import {
  PVMExitReasonMod,
  PVMIxEvaluateFNContext,
  PVMSingleModPointer,
  u32,
} from "@tsjam/types";
import { IxMod } from "../instructions/utils";

/**
 * Branch to the given address if the condition is true.
 * and the preconditions are met
 * @param context - the current evaluating context
 * @param address - the address to branch to
 * @param condition - the condition that must be true to branch
 * @param gasCost - the cost of the ix calling in case of panic
 * $(0.7.1 - A.17)
 */
export const branch = (
  context: PVMIxEvaluateFNContext,
  address: u32,
  condition: boolean | 0 | 1,
): Array<PVMSingleModPointer | PVMExitReasonMod<PVMExitReasonImpl>> => {
  if (!condition) {
    // even if (226) says that instruction pointer should not move
    // we should allow that
    return [];
  }
  if (!context.parsedProgram.isBlockBeginning(address)) {
    return [
      IxMod.ip(context.execution.instructionPointer), // stay here - overrides any other ip mods before
      IxMod.panic(), // should not account for gas of panic
    ];
  }
  return [IxMod.ip(address)];
};
