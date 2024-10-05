import {
  PVMIx,
  PVMModification,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";

/**
 * Branch to the given address if the condition is true.
 * and the preconditions are met
 * @param context - the current evaluating context
 * @param address - the address to branch to
 * @param condition - the condition that must be true to branch
 * @see `226` on graypaper
 */
export const branch = (
  context: Parameters<PVMIx<unknown[]>["evaluate"]>[0],
  address: u32,
  condition: boolean | 0 | 1,
): PVMModification[] => {
  if (!condition) {
    // even if (226) says that instruction pointer should not move
    // we should allow that
    return [];
  }
  if (!context.parsedProgram.isBlockBeginning(address)) {
    return [
      { type: "exit", data: RegularPVMExitReason.Panic },
      { type: "ip", data: context.execution.instructionPointer },
    ];
  }
  return [{ type: "ip", data: address }];
};
