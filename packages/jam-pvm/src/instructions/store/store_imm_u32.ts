import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";
import assert from "node:assert";
import { decode2IMM } from "@/utils/decoders.js";

export const StoreImmU32Ix: GenericPVMInstruction<[offset: u32, value: u32]> = {
  identifier: 38 as u8,
  name: "store_imm_u32",
  decode(bytes: Uint8Array) {
    assert(
      bytes[0] === this.identifier,
      "invalid identifier expected store_imm_u8",
    );
    return decode2IMM(bytes);
  },
  evaluate(context: EvaluationContext, offset: u32, value: u32) {
    assert(value <= 0xffffffff, "value must be u32");
    // TODO: implement memory checks
    context.memory[offset] = value >> 24;
    context.memory[offset + 1] = (value >> 16) % 0xff;
    context.memory[offset + 2] = (value >> 8) % 0xff;
    context.memory[offset + 3] = value % 0xff;
    return {};
  },
};
