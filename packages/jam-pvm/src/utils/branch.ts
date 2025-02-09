import { Result, err, ok } from "neverthrow";
import {
  PVMExitPanicMod,
  PVMIx,
  PVMIxEvaluateFNContext,
  PVMIxExecutionError,
  PVMSingleModPointer,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";
import { IxMod } from "@/instructions/utils";

/**
 * Branch to the given address if the condition is true.
 * and the preconditions are met
 * @param context - the current evaluating context
 * @param address - the address to branch to
 * @param condition - the condition that must be true to branch
 * @param gasCost - the cost of the ix calling in case of panic
 * $(0.6.1 - A.16)
 */
export const branch = (
  context: PVMIxEvaluateFNContext,
  address: u32,
  condition: boolean | 0 | 1,
): Array<PVMSingleModPointer | PVMExitPanicMod> => {
  if (!condition) {
    // even if (226) says that instruction pointer should not move
    // we should allow that
    return [];
  }
  if (!context.parsedProgram.isBlockBeginning(address)) {
    return [
      IxMod.ip(context.execution.instructionPointer), // stay here
      IxMod.panic(), // should not account for gas of panic
    ];
  }
  return [IxMod.ip(address)];
};
