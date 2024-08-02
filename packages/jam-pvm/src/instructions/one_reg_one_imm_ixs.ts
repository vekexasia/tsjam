import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u16, u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { RegisterIdentifier } from "@/types.js";
import { decode1Reg1IMM } from "@/utils/decoders.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { RegularPVMExitReason } from "@/exitReason.js";
import { Z, Z_inv } from "@/utils/zed.js";
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

const ZA = 4;
export const JumpIndIx = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.registers[ri];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;

    // first branch of djump(a)
    if (jumpLocation == 2 ** 32 - 2 ** 16) {
      return { exitReason: RegularPVMExitReason.Halt };
    } else if (
      jumpLocation === 0 ||
      jumpLocation > context.program.j.length * ZA ||
      jumpLocation % ZA != 0 ||
      false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
    ) {
      return { exitReason: RegularPVMExitReason.Panic };
    }

    return {
      nextInstructionPointer: (context.program.j[
        Math.floor(jumpLocation / ZA)
      ] - 1) as u32,
    };
  },
);

// ### Load unsigned
export const LoadImmIx = create1Reg1IMMIx(
  4 as u8,
  "load_imm",
  (context, ri, vx) => {
    context.registers[ri] = vx;
    return {};
  },
);

export const LoadU8Ix = create1Reg1IMMIx(
  60 as u8,
  "load_u8",
  (context, ri, vx) => {
    context.registers[ri] = context.memory.get(vx) as number as u32;
    return {};
  },
);

export const LoadU16Ix = create1Reg1IMMIx(
  76 as u8,
  "load_u16",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 2)),
    ) as u32;
    return {};
  },
);

export const LoadU32Ix = create1Reg1IMMIx(
  10 as u8,
  "load_u32",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 4)),
    ) as u32;
    return {};
  },
);

// ### Load signed
export const LoadI8Ix = create1Reg1IMMIx(
  74 as u8,
  "load_i8",
  (context, ri, vx) => {
    context.registers[ri] = Z_inv(4, Z(1, context.memory.get(vx)));
    return {};
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
    return {};
  },
);

// ### Store

export const StoreU8Ix = create1Reg1IMMIx(
  71 as u8,
  "store_u8",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 256) as u8;
    context.memory.set(vx, wa);
    return {};
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
    return {};
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
    return {};
  },
);
