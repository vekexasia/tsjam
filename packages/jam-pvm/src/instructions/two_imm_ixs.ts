import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u16, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";
import assert from "node:assert";
import { decode2IMM } from "@/utils/decoders.js";
import { LittleEndian } from "@vekexasia/jam-codec";
const create2ImmIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<[vX: u32, vY: u32]>["evaluate"],
): GenericPVMInstruction<[u32, u32]> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      return decode2IMM(bytes);
    },
    evaluate,
  };
};

export const store_imm_u8 = create2ImmIx(
  62 as u8,
  "store_imm_u8",
  (context, offset, value) => {
    context.memory.set(offset, (value % 256) as u8);
  },
);

export const store_imm_u16 = create2ImmIx(
  79 as u8,
  "store_imm_u16",
  (context, offset, value) => {
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(value % 2 ** 16), tmp);
    context.memory.setBytes(offset, tmp);
  },
);

export const store_imm_u32 = create2ImmIx(
  38 as u8,
  "store_imm_u32",
  (context, offset, value) => {
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(offset, tmp);
  },
);
