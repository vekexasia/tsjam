import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u16, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";
import assert from "node:assert";
import { decode2IMM } from "@/utils/decoders.js";

export const StoreImmU16Ix: GenericPVMInstruction<[offset: u32, value: u16]> = {
  identifier: 79 as u8,
  name: "store_imm_u16",
  decode(bytes: Uint8Array) {
    assert(
      bytes[0] === this.identifier,
      "invalid identifier expected store_imm_u8",
    );
    const [offset, value] = decode2IMM(bytes);
    return [offset, (value % 0xffff) as u16];
  },
  evaluate(context: EvaluationContext, offset: u32, value: u16) {
    assert(value <= 0xffff, "value must be u16");
    // TODO: implement memory checks
    context.memory[offset] = value >> 8;
    context.memory[offset + 1] = value % 0xff;
    return {};
  },
};
