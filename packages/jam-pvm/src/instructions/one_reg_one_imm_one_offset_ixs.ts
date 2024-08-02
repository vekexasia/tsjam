import { u32, u8 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import assert from "node:assert";
import { decode1Reg1IMM1Offset } from "@/utils/decoders.js";
import { branch } from "@/utils/branch.js";
import { Z } from "@/utils/zed.js";

const create1Reg1IMM1OffsetIx = (
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
      return decode1Reg1IMM1Offset(bytes);
    },
    evaluate(context, ri, vx, offset) {
      // in reality here offset is i32.
      const vy = (context.instructionPointer + offset) as u32;
      return evaluate(context, ri, vx, vy);
    },
  };
};

export const loadIMMJumpIx = create1Reg1IMM1OffsetIx(
  6 as u8,
  "load_imm_jump",
  (context, ri, vx, vy) => {
    context.registers[ri] = vx;
    return branch(context, vy, true);
  },
);

export const BranchEqImm = create1Reg1IMM1OffsetIx(
  7 as u8,
  "branch_eq_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] === vx);
  },
);

export const BranchNeImm = create1Reg1IMM1OffsetIx(
  15 as u8,
  "branch_ne_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] != vx);
  },
);

export const BranchLTUImm = create1Reg1IMM1OffsetIx(
  44 as u8,
  "branch_lt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] < vx);
  },
);

export const BranchLEUImm = create1Reg1IMM1OffsetIx(
  59 as u8,
  "branch_le_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] <= vx);
  },
);

export const BranchGEUImm = create1Reg1IMM1OffsetIx(
  52 as u8,
  "branch_ge_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] >= vx);
  },
);

export const BranchGTUImm = create1Reg1IMM1OffsetIx(
  50 as u8,
  "branch_gt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] > vx);
  },
);

export const BranchLTSImm = create1Reg1IMM1OffsetIx(
  32 as u8,
  "branch_lt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) < Z(4, vx));
  },
);

export const BranchLESImm = create1Reg1IMM1OffsetIx(
  46 as u8,
  "branch_le_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) <= Z(4, vx));
  },
);

export const BranchGESImm = create1Reg1IMM1OffsetIx(
  45 as u8,
  "branch_ge_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) >= Z(4, vx));
  },
);

export const BranchGTSImm = create1Reg1IMM1OffsetIx(
  53 as u8,
  "branch_gt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) > Z(4, vx));
  },
);
