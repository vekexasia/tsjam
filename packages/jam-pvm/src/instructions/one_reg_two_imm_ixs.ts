import { u32, u8 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import assert from "node:assert";
import { decode1Reg2iMM } from "@/utils/decoders.js";
import { LittleEndian } from "@vekexasia/jam-codec";

const create1Reg2IMMIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<[RegisterIdentifier, u32, u32]>["evaluate"],
): GenericPVMInstruction<[RegisterIdentifier, u32, u32]> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      return decode1Reg2iMM(bytes);
    },
    evaluate,
  };
};

export const StoreImmIndU8Ix = create1Reg2IMMIx(
  26 as u8,
  "store_imm_ind_u8",
  (context, ri, vx, vy) => {
    context.memory.set(context.registers[ri] + vx, (vy % 0xff) as u8);
  },
);
export const StoreImmIndU16Ix = create1Reg2IMMIx(
  54 as u8,
  "store_imm_ind_u16",
  (context, ri, vx, vy) => {
    const value = vy % 0xffff;
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(context.registers[ri] + vx, tmp);
  },
);
export const StoreImmIndU32Ix = create1Reg2IMMIx(
  13 as u8,
  "store_imm_ind_u32",
  (context, ri, vx, vy) => {
    const value = vy % 0xffffffff;
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(context.registers[ri] + vx, tmp);
  },
);
