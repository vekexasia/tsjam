import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u16, u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { RegisterIdentifier } from "@/types.js";
import { decode1Reg1IMM } from "@/utils/decoders.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { RegularPVMExitReason } from "@/exitReason.js";
import { Z, Z_inv } from "@/utils/zed.js";
import { djump } from "@/utils/djump.js";
const create1Reg1IMMIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<[RegisterIdentifier, u32]>["evaluate"],
): GenericPVMInstruction<[RegisterIdentifier, u32]> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      return decode1Reg1IMM(bytes);
    },
    evaluate,
  };
};

export const JumpIndIx = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.registers[ri];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;
    return djump(context, jumpLocation);
  },
);

// ### Load unsigned
export const LoadImmIx = create1Reg1IMMIx(
  4 as u8,
  "load_imm",
  (context, ri, vx) => {
    context.registers[ri] = vx;
  },
);

export const LoadU8Ix = create1Reg1IMMIx(
  60 as u8,
  "load_u8",
  (context, ri, vx) => {
    context.registers[ri] = context.memory.get(vx) as number as u32;
  },
);

export const LoadU16Ix = create1Reg1IMMIx(
  76 as u8,
  "load_u16",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 2)),
    ) as u32;
  },
);

export const LoadU32Ix = create1Reg1IMMIx(
  10 as u8,
  "load_u32",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 4)),
    ) as u32;
  },
);

// ### Load signed
export const LoadI8Ix = create1Reg1IMMIx(
  74 as u8,
  "load_i8",
  (context, ri, vx) => {
    context.registers[ri] = Z_inv(4, Z(1, context.memory.get(vx)));
  },
);
export const LoadI16Ix = create1Reg1IMMIx(
  76 as u8,
  "load_i16",
  (context, ri, vx) => {
    context.registers[ri] = Z_inv(
      4,
      Z(2, Number(LittleEndian.decode(context.memory.getBytes(vx, 2)))),
    );
  },
);

// ### Store

export const StoreU8Ix = create1Reg1IMMIx(
  71 as u8,
  "store_u8",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 256) as u8;
    context.memory.set(vx, wa);
  },
);
export const StoreU16Ix = create1Reg1IMMIx(
  69 as u8,
  "store_u16",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 2 ** 16) as u16;
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(wa), tmp);
    context.memory.setBytes(vx, tmp);
  },
);
export const StoreU32Ix = create1Reg1IMMIx(
  22 as u8,
  "store_u32",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 2 ** 32) as u32;
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(wa), tmp);
    context.memory.setBytes(vx, tmp);
  },
);
