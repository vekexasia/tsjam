import { u16, u32, u8 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import assert from "node:assert";
import { LittleEndian } from "@vekexasia/jam-codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { Z, Z_inv } from "@/utils/zed.js";

const create2Reg1IMMIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vX: u32]
  >["evaluate"],
): GenericPVMInstruction<[RegisterIdentifier, RegisterIdentifier, u32]> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      const rA = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
      const rB = Math.min(12, Math.floor(bytes[1] / 16)) as RegisterIdentifier;
      const lX = Math.min(4, Math.max(0, bytes.length - 2));
      const imm = readVarIntFromBuffer(bytes.subarray(2), lX as u8);
      return [rA, rB, imm];
    },
    evaluate,
  };
};

// # store

export const store_ind_u8 = create2Reg1IMMIx(
  16 as u8,
  "store_ind_u8",
  (context, rA, rB, vX) => {
    const e = context.memory.set(
      context.registers[rB] + vX,
      (context.registers[rA] % 0xff) as u8,
    );
    if (e) {
      return { exitReason: e };
    }
  },
);

export const store_ind_u16 = create2Reg1IMMIx(
  29 as u8,
  "store_ind_u16",
  (context, rA, rB, vX) => {
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(context.registers[rA] % 0xffff), tmp);
    const e = context.memory.setBytes(context.registers[rB] + vX, tmp);
    if (e) {
      return { exitReason: e };
    }
  },
);

export const store_ind_u32 = create2Reg1IMMIx(
  3 as u8,
  "store_ind_u32",
  (context, rA, rB, vX) => {
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(context.registers[rA]), tmp);
    const e = context.memory.setBytes(context.registers[rB] + vX, tmp);
    if (e) {
      return { exitReason: e };
    }
  },
);

// # load unsigned
export const load_ind_u8 = create2Reg1IMMIx(
  11 as u8,
  "load_ind_u8",
  (context, rA, rB, vX) => {
    context.registers[rA] = context.memory.get(
      context.registers[rB] + vX,
    ) as number as u32; // it's a u8 but typescript doesn't know that
  },
);

export const load_ind_u16 = create2Reg1IMMIx(
  37 as u8,
  "load_ind_u16",
  (context, rA, rB, vX) => {
    const r = context.memory.getBytes(context.registers[rB] + vX, 2);
    if (!(r instanceof Uint8Array)) {
      return { exitReason: r };
    }
    context.registers[rA] = Number(LittleEndian.decode(r)) as u32;
  },
);

export const load_ind_u32 = create2Reg1IMMIx(
  1 as u8,
  "load_ind_u32",
  (context, rA, rB, vX) => {
    const r = context.memory.getBytes(context.registers[rB] + vX, 4);
    if (!(r instanceof Uint8Array)) {
      return { exitReason: r };
    }
    context.registers[rA] = Number(LittleEndian.decode(r)) as u32;
  },
);

// # load signed
export const load_ind_i8 = create2Reg1IMMIx(
  56 as u8,
  "load_ind_i8",
  (context, rA, rB, vX) => {
    const val = context.memory.get(context.registers[rB] + vX);
    if (!(typeof val == "number")) {
      return { exitReason: val };
    }
    context.registers[rA] = Z_inv(4, Z(1, val));
  },
);

export const load_ind_i16 = create2Reg1IMMIx(
  33 as u8,
  "load_ind_i16",
  (context, rA, rB, vX) => {
    const val = context.memory.getBytes(context.registers[rB] + vX, 2);
    if (!(val instanceof Uint8Array)) {
      return { exitReason: val };
    }
    const num = Number(LittleEndian.decode(val));
    context.registers[rA] = Z_inv(4, Z(2, num));
  },
);

// math
export const add_ind = create2Reg1IMMIx(
  2 as u8,
  "add_ind",
  (context, rA, rB, vX) => {
    context.registers[rB] = ((context.registers[rA] + vX) % 2 ** 32) as u32;
  },
);

export const and_ind = create2Reg1IMMIx(
  18 as u8,
  "and_ind",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] & vX) as u32;
  },
);

export const xor_ind = create2Reg1IMMIx(
  18 as u8,
  "xor_ind",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] ^ vX) as u32;
  },
);

export const or_ind = create2Reg1IMMIx(
  49 as u8,
  "or_ind",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] | vX) as u32;
  },
);

export const mul_imm = create2Reg1IMMIx(
  35 as u8,
  "mul_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = ((context.registers[rA] * vX) % 2 ** 32) as u32;
  },
);

export const mul_upper_s_s_imm = create2Reg1IMMIx(
  65 as u8,
  "mul_upper_s_s_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = Z_inv(
      4,
      Math.floor((Z(4, context.registers[rA]) * Z(4, vX)) / 2 ** 32),
    );
  },
);

export const mul_upper_u_u_imm = create2Reg1IMMIx(
  63 as u8,
  "mul_upper_u_u_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = Math.floor(
      (context.registers[rA] * vX) / 2 ** 32,
    ) as u32;
  },
);

export const neg_add_imm = create2Reg1IMMIx(
  40 as u8,
  "neg_add_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = ((vX + 2 ** 32 - context.registers[rA]) %
      2 ** 32) as u32;
  },
);

// # bitshifts
export const shlo_l_imm = create2Reg1IMMIx(
  9 as u8,
  "shlo_l_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = ((context.registers[rA] << vX % 32) %
      2 ** 32) as u32;
  },
);
export const shlo_l_imm_alt = create2Reg1IMMIx(
  75 as u8,
  "shlo_l_imm_alt",
  (context, rA, rB, vX) => {
    context.registers[rB] = ((vX << context.registers[rA] % 32) %
      2 ** 32) as u32;
  },
);
export const shlo_r_imm = create2Reg1IMMIx(
  14 as u8,
  "shlo_r_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] >> vX % 32) as u32;
  },
);

export const shlo_r_imm_alt = create2Reg1IMMIx(
  72 as u8,
  "shlo_r_imm_alt",
  (context, rA, rB, vX) => {
    context.registers[rB] = (vX >> context.registers[rA] % 32) as u32;
  },
);

export const shar_r_imm = create2Reg1IMMIx(
  25 as u8,
  "shar_r_imm",
  (context, rA, rB, vX) => {
    // TODO: i think this can be simplified with >>>  operator
    context.registers[rB] = Z_inv(4, Z(4, context.registers[rA]) >> vX % 32);
  },
);

export const shar_r_imm_alt = create2Reg1IMMIx(
  80 as u8,
  "shar_r_imm_alt",
  (context, rA, rB, vX) => {
    // TODO: i think this can be simplified with >>>  operator
    context.registers[rB] = Z_inv(4, Z(4, vX) >> context.registers[rA] % 32);
  },
);

// # sets
export const set_lt_u_imm = create2Reg1IMMIx(
  27 as u8,
  "set_lt_u_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] < vX ? 1 : 0) as u32;
  },
);

export const set_lt_s_imm = create2Reg1IMMIx(
  56 as u8,
  "set_lt_s_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = (
      Z(4, context.registers[rA]) < Z(4, vX) ? 1 : 0
    ) as u32;
  },
);
export const set_gt_u_imm = create2Reg1IMMIx(
  39 as u8,
  "set_gt_u_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = (context.registers[rA] > vX ? 1 : 0) as u32;
  },
);

export const set_gt_s_imm = create2Reg1IMMIx(
  61 as u8,
  "set_gt_s_imm",
  (context, rA, rB, vX) => {
    context.registers[rB] = (
      Z(4, context.registers[rA]) > Z(4, vX) ? 1 : 0
    ) as u32;
  },
);

export const cmov_iz_imm = create2Reg1IMMIx(
  85 as u8,
  "cmov_iz_imm",
  (context, rA, rB, vX) => {
    if (context.registers[rB] === 0) {
      context.registers[rA] = vX;
    }
  },
);

export const cmov_nz_imm = create2Reg1IMMIx(
  86 as u8,
  "cmov_nz_imm",
  (context, rA, rB, vX) => {
    if (context.registers[rB] !== 0) {
      context.registers[rA] = vX;
    }
  },
);
