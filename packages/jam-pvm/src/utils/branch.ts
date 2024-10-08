import { Result, err, ok } from "neverthrow";
import {
  PVMIx,
  PVMIxExecutionError,
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
  context: Parameters<PVMIx<unknown[], PVMIxExecutionError>["evaluate"]>[0],
  address: u32,
  condition: boolean | 0 | 1,
): Result<PVMModification[], PVMIxExecutionError> => {
  if (!condition) {
    // even if (226) says that instruction pointer should not move
    // we should allow that
    return ok([]);
  }
  if (!context.parsedProgram.isBlockBeginning(address)) {
    return err(
      new PVMIxExecutionError(
        [{ type: "ip", data: context.execution.instructionPointer }],
        RegularPVMExitReason.Panic,
        "branch",
      ),
    );
  }
  return ok([{ type: "ip", data: address }]);
};
