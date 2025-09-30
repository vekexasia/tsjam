import { PVMExitReasonImpl } from "@tsjam/pvm-base";
import { u32 } from "@tsjam/types";
import { PVMJS } from "..";

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
  pvm: PVMJS,
  address: u32,
  condition: boolean | 0 | 1,
  skipIfFalse: number,
): PVMExitReasonImpl | void => {
  if (condition) {
    if (!pvm.isBlockBeginning(address)) {
      return PVMExitReasonImpl.panic();
    }
    pvm.pc = address;
  } else {
    pvm.pc = <u32>(pvm.pc + skipIfFalse);
  }
};
