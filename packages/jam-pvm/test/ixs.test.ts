import "@/instructions/index.js";
import { describe, expect, it } from "vitest";
import { Ixdb } from "@/instructions/ixdb.js";
describe("allixs", () => {
  it("should have registered all opcodes", () => {
    const opcodes = [...Ixdb.byCode.keys()].sort((a, b) => a - b);
    expect(opcodes).toEqual(new Array(88).fill(0).map((_, i) => i));
  });
  it("should properly have the blockTerminators", () => {
    const opcodes = [...Ixdb.blockTerminators.values()].sort((a, b) => a - b);

    expect(opcodes).toEqual([
      0, //trap
      5, // jump
      6, // load_imm_jump
      7, // branch_eq_imm
      15, // branch_ne_imm
      17, // fallthrough
      19, // jump_ind
      24, // branch_eq
      30, // branch_ne
      32, // branch_lt_s_imm
      41, // branch_ge_u
      42, // load_imm_jump_ind
      43, // branch_ge_s
      44, // branch_lt_u_imm
      45, // branch_ge_s_imm
      46, // branch_le_s_imm
      47, // branch_lt_u
      48, // branch_lt_s
      50, // branch_gt_u_imm
      52, // branch_ge_u_imm
      53, // branch_gt_s_imm
      59, // branch_le_u_imm
    ]);
  });
});
