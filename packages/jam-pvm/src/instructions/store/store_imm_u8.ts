import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";
import assert from "node:assert";

export const StoreImmU8Ix: GenericPVMInstruction<u32, u32> = {
  identifier: 62 as u8,
  name: "store_imm_u8",
  decode(
    context: EvaluationContext,
    data: Uint8Array,
    offset: u32,
  ): { args: [u32, u32]; nextOffset: u32 } {},
  evaluate(context: EvaluationContext, offset: u32, value: u32) {
    assert(value <= 0xff, "value must be u8");
    // TODO: implement memory checks
    context.memory[offset] = value;
    return {};
  },
};
