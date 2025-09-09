import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { u32 } from "@tsjam/types";

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
  context: PVMIxEvaluateFNContextImpl,
  address: u32,
  condition: boolean | 0 | 1,
  skipIfFalse: number,
): PVMExitReasonImpl | void => {
  if (condition) {
    if (!context.program.isBlockBeginning(address)) {
      return PVMExitReasonImpl.panic();
    }
    context.execution.instructionPointer = address;
  } else {
    context.execution.instructionPointer = <u32>(
      (context.execution.instructionPointer + skipIfFalse)
    );
  }
};
