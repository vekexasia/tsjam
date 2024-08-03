import {
  EvaluateFunction,
  GenericPVMInstruction,
} from "@/instructions/genericInstruction.js";
import { u16, u32, u8 } from "@vekexasia/jam-types";
import { RegisterIdentifier } from "@/types.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { Z, Z_inv } from "@/utils/zed.js";
import { djump } from "@/utils/djump.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";

type InputType = [register: RegisterIdentifier, value: u32];
const decode1Reg1IMM = (bytes: Uint8Array): InputType => {
  const ra = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 2));
  const vx = readVarIntFromBuffer(bytes.subarray(2), lx as u8);
  return [ra, vx];
};

const create1Reg1IMMIx = (
  opCode: u8,
  identifier: string,
  evaluate: EvaluateFunction<InputType>,
  blockTermination?: true,
) => {
  return regIx({
    opCode,
    identifier,
    blockTermination,
    ix: {
      decode(bytes) {
        return decode1Reg1IMM(bytes);
      },
      evaluate,
    },
  });
};

export const jump_ind = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.registers[ri];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;
    return djump(context, jumpLocation);
  },
  true,
);

// ### Load unsigned
export const load_imm = create1Reg1IMMIx(
  4 as u8,
  "load_imm",
  (context, ri, vx) => {
    context.registers[ri] = vx;
  },
);

export const load_u8 = create1Reg1IMMIx(
  60 as u8,
  "load_u8",
  (context, ri, vx) => {
    context.registers[ri] = context.memory.get(vx) as number as u32;
  },
);

export const load_u16 = create1Reg1IMMIx(
  76 as u8,
  "load_u16",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 2)),
    ) as u32;
  },
);

export const load_u32 = create1Reg1IMMIx(
  10 as u8,
  "load_u32",
  (context, ri, vx) => {
    context.registers[ri] = Number(
      LittleEndian.decode(context.memory.getBytes(vx, 4)),
    ) as u32;
  },
);

// ### Load signed
export const load_i8 = create1Reg1IMMIx(
  74 as u8,
  "load_i8",
  (context, ri, vx) => {
    context.registers[ri] = Z_inv(4, Z(1, context.memory.get(vx)));
  },
);
export const load_i16 = create1Reg1IMMIx(
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

export const store_u8 = create1Reg1IMMIx(
  71 as u8,
  "store_u8",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 256) as u8;
    context.memory.set(vx, wa);
  },
);
export const store_u16 = create1Reg1IMMIx(
  69 as u8,
  "store_u16",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 2 ** 16) as u16;
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(wa), tmp);
    context.memory.setBytes(vx, tmp);
  },
);
export const store_u32 = create1Reg1IMMIx(
  22 as u8,
  "store_u32",
  (context, ri, vx) => {
    const wa = (context.registers[ri] % 2 ** 32) as u32;
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(wa), tmp);
    context.memory.setBytes(vx, tmp);
  },
);
