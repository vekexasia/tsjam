import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";
import assert from "node:assert";
import { decode2IMM } from "@/utils/decoders.js";

export const StoreImmU8Ix: GenericPVMInstruction<[offset: u32, value: u8]> = {
  identifier: 62 as u8,
  name: "store_imm_u8",
  decode(bytes: Uint8Array) {
    assert(
      bytes[0] === this.identifier,
      "invalid identifier expected store_imm_u8",
    );
    const [offset, value] = decode2IMM(bytes);
    return [offset, (value % 0xff) as u8];
  },
  evaluate(context: EvaluationContext, offset: u32, value: u8) {
    assert(value <= 0xff, "value must be u8");
    // TODO: implement memory checks
    context.memory[offset] = value;
    return {};
  },
};
