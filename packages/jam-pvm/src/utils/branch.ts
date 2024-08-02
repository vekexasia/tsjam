import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { EvaluationContext } from "@/evaluationContext.js";
import { u32 } from "@vekexasia/jam-types";
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
  context: EvaluationContext,
  address: u32,
  condition: boolean | 0 | 1,
): ReturnType<GenericPVMInstruction<never>["evaluate"]> => {
  if (!condition) {
    return {};
  }

  assert(
    context.program.k[address] !== 1,
    "branch target is not an instruction",
  );

  //TODO check if address is not a start of a new block

  return {
    nextInstructionPointer: address,
  };
};
