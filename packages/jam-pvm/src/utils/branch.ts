import { PVMIx, RegularPVMExitReason, u32 } from "@vekexasia/jam-types";
import assert from "node:assert";

/**
 * Branch to the given address if the condition is true.
 * and the preconditions are met
 * @param context - the current evaluating context
 * @param address - the address to branch to
 * @param condition - the condition that must be true to branch
 * @see `226` on graypaper
 */
export const branch = (
  context: Parameters<PVMIx<any>["evaluate"]>[0],
  address: u32,
  condition: boolean | 0 | 1,
): ReturnType<PVMIx<never>["evaluate"]> => {
  if (!condition) {
    // even if (226) says that instruction pointer should not move
    // we should allow that
    return;
  }
  if (!context.parsedProgram.isBlockBeginning(address)) {
    return {
      exitReason: RegularPVMExitReason.Panic,
      nextInstructionPointer: context.execution.instructionPointer,
    };
  }

  return {
    nextInstructionPointer: address,
  };
};
