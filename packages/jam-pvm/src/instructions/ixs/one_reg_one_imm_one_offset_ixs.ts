import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { branch } from "@/utils/branch.js";
import { Z } from "@/utils/zed.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { regIx } from "@/instructions/ixdb.js";

export const decode1Reg1IMM1Offset = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, vx: u32, offset: u32] => {
  const ra = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[1] / 16) % 8);
  const ly = Math.min(4, Math.max(0, bytes.length - 2 - lx));
  const vx = readVarIntFromBuffer(bytes.subarray(2, 2 + lx), lx as u8);
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset
  const offset = Z(
    ly,
    Number(LittleEndian.decode(bytes.subarray(2 + lx, 2 + lx + ly))),
  ) as u32;
  return [ra, vx, offset];
};

const create1Reg1IMM1OffsetIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[RegisterIdentifier, u32, u32]>,
  blockTermination?: true,
) => {
  return regIx<[RegisterIdentifier, u32, u32]>({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode(bytes) {
        return decode1Reg1IMM1Offset(bytes);
      },
      evaluate(context, ri, vx, offset) {
        // in reality here offset is i32.
        const vy = (context.instructionPointer + offset) as u32;
        return evaluate(context, ri, vx, vy);
      },
    },
  });
};

export const loadIMMJumpIx = create1Reg1IMM1OffsetIx(
  6 as u8,
  "load_imm_jump",
  (context, ri, vx, vy) => {
    context.registers[ri] = vx;
    return branch(context, vy, true);
  },
  true,
);

export const BranchEqImm = create1Reg1IMM1OffsetIx(
  7 as u8,
  "branch_eq_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] === vx);
  },
  true,
);

export const BranchNeImm = create1Reg1IMM1OffsetIx(
  15 as u8,
  "branch_ne_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] != vx);
  },
  true,
);

export const BranchLTUImm = create1Reg1IMM1OffsetIx(
  44 as u8,
  "branch_lt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] < vx);
  },
  true,
);

export const BranchLEUImm = create1Reg1IMM1OffsetIx(
  59 as u8,
  "branch_le_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] <= vx);
  },
  true,
);

export const BranchGEUImm = create1Reg1IMM1OffsetIx(
  52 as u8,
  "branch_ge_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] >= vx);
  },
  true,
);

export const BranchGTUImm = create1Reg1IMM1OffsetIx(
  50 as u8,
  "branch_gt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] > vx);
  },
  true,
);

export const BranchLTSImm = create1Reg1IMM1OffsetIx(
  32 as u8,
  "branch_lt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) < Z(4, vx));
  },
  true,
);

export const BranchLESImm = create1Reg1IMM1OffsetIx(
  46 as u8,
  "branch_le_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) <= Z(4, vx));
  },
  true,
);

export const BranchGESImm = create1Reg1IMM1OffsetIx(
  45 as u8,
  "branch_ge_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) >= Z(4, vx));
  },
  true,
);

export const BranchGTSImm = create1Reg1IMM1OffsetIx(
  53 as u8,
  "branch_gt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) > Z(4, vx));
  },
  true,
);
