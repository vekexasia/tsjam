import "@/instructions/index.js";
import { describe, expect, it } from "vitest";
import { Ixdb } from "@/instructions/ixdb.js";
import * as fs from "node:fs";
import { createEvContext } from "@/test/mocks.js";
import { toTagged } from "@vekexasia/jam-utils";
import { PVMProgramCodec } from "@vekexasia/jam-codec";
import { ParsedProgram } from "@/parseProgram.js";
import { runProgramSTF } from "@/stfs/runProgram.js";
import { RegularPVMExitReason } from "@vekexasia/jam-types";

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
describe("testcases", () => {
  const doTest = (filename: string) => () => {
    const json = JSON.parse(
      fs.readFileSync(`${__dirname}/fixtures/${filename}.json`, "utf-8"),
    );
    const context = createEvContext();
    context.execution.gas = toTagged(BigInt(json["initial-gas"]));
    // context.execution.memory = new
    context.execution.instructionPointer = toTagged(json["initial-pc"]);
    context.execution.registers = json["initial-regs"];

    const program = PVMProgramCodec.decode(new Uint8Array(json.program));
    context.program = program.value;
    context.parsedProgram = ParsedProgram.parse(program.value);
    const r = runProgramSTF.apply(
      {
        program: program.value,
      },
      context.execution,
    );
    expect(r.context.registers).toEqual(json["expected-regs"]);
    expect(r.context.instructionPointer).toEqual(json["expected-pc"]);
    expect(r.exitReason == RegularPVMExitReason.Panic ? "trap" : 0).toEqual(
      json["expected-status"],
    );
  };
  it("inst_add_imm", doTest("inst_add_imm"));
  it("inst_add", doTest("inst_add"));
  it("inst_add_with_overflow", doTest("inst_add_with_overflow"));
  it("inst_and", doTest("inst_and"));
  it("inst_and_imm", doTest("inst_and_imm"));
  it("inst_branch_eq_imm_nok", doTest("inst_branch_eq_imm_nok"));
  it("inst_branch_eq_imm_ok", doTest("inst_branch_eq_imm_ok"));
  it("inst_branch_eq_nok", doTest("inst_branch_eq_nok"));
  it("inst_branch_eq_ok", doTest("inst_branch_eq_ok"));
  it(
    "inst_branch_greater_or_equal_signed_imm_nok",
    doTest("inst_branch_greater_or_equal_signed_imm_nok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_imm_ok",
    doTest("inst_branch_greater_or_equal_signed_imm_ok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_nok",
    doTest("inst_branch_greater_or_equal_signed_nok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_ok",
    doTest("inst_branch_greater_or_equal_signed_ok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_imm_nok",
    doTest("inst_branch_greater_or_equal_unsigned_imm_nok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_imm_ok",
    doTest("inst_branch_greater_or_equal_unsigned_imm_ok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_nok",
    doTest("inst_branch_greater_or_equal_unsigned_nok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_ok",
    doTest("inst_branch_greater_or_equal_unsigned_ok"),
  );
  it(
    "inst_branch_greater_signed_imm_nok",
    doTest("inst_branch_greater_signed_imm_nok"),
  );

  it(
    "inst_branch_greater_signed_imm_ok",
    doTest("inst_branch_greater_signed_imm_ok"),
  );
  it(
    "inst_branch_greater_unsigned_imm_nok",
    doTest("inst_branch_greater_unsigned_imm_nok"),
  );
  it(
    "inst_branch_greater_unsigned_imm_ok",
    doTest("inst_branch_greater_unsigned_imm_ok"),
  );
  it(
    "inst_branch_less_or_equal_signed_imm_nok",
    doTest("inst_branch_less_or_equal_signed_imm_nok"),
  );
  it(
    "inst_branch_less_or_equal_signed_imm_ok",
    doTest("inst_branch_less_or_equal_signed_imm_ok"),
  );
  it(
    "inst_branch_less_or_equal_unsigned_imm_nok",
    doTest("inst_branch_less_or_equal_unsigned_imm_nok"),
  );
  it(
    "inst_branch_less_or_equal_unsigned_imm_ok",
    doTest("inst_branch_less_or_equal_unsigned_imm_ok"),
  );
  it(
    "inst_branch_less_signed_imm_nok",
    doTest("inst_branch_less_signed_imm_nok"),
  );
  it(
    "inst_branch_less_signed_imm_ok",
    doTest("inst_branch_less_signed_imm_ok"),
  );
  it("inst_branch_less_signed_nok", doTest("inst_branch_less_signed_nok"));
  it("inst_branch_less_signed_ok", doTest("inst_branch_less_signed_ok"));
  it(
    "inst_branch_less_unsigned_imm_nok",
    doTest("inst_branch_less_unsigned_imm_nok"),
  );
  it(
    "inst_branch_less_unsigned_imm_ok",
    doTest("inst_branch_less_unsigned_imm_ok"),
  );
  it("inst_branch_less_unsigned_nok", doTest("inst_branch_less_unsigned_nok"));
  it("inst_branch_less_unsigned_ok", doTest("inst_branch_less_unsigned_ok"));
  it("inst_branch_not_eq_imm_nok", doTest("inst_branch_not_eq_imm_nok"));
  it("inst_branch_not_eq_imm_ok", doTest("inst_branch_not_eq_imm_ok"));
  it("inst_branch_not_eq_nok", doTest("inst_branch_not_eq_nok"));
  it("inst_branch_not_eq_ok", doTest("inst_branch_not_eq_ok"));
  it("inst_cmov_if_zero_imm_nok", doTest("inst_cmov_if_zero_imm_nok"));
  it("inst_cmov_if_zero_imm_ok", doTest("inst_cmov_if_zero_imm_ok"));
  it("inst_cmov_if_zero_nok", doTest("inst_cmov_if_zero_nok"));
  it("inst_cmov_if_zero_ok", doTest("inst_cmov_if_zero_ok"));
  it("inst_div_signed", doTest("inst_div_signed"));
  it("inst_div_signed_by_zero", doTest("inst_div_signed_by_zero"));
  it("inst_div_signed_with_overflow", doTest("inst_div_signed_with_overflow"));
  it("inst_div_unsigned", doTest("inst_div_unsigned"));
  it("inst_div_unsigned_by_zero", doTest("inst_div_unsigned_by_zero"));
  it(
    "inst_div_unsigned_with_overflow",
    doTest("inst_div_unsigned_with_overflow"),
  );
  it("inst_fallthrough", doTest("inst_fallthrough"));
  it("inst_jump", doTest("inst_jump"));
  it("inst_load_imm", doTest("inst_load_imm"));
  it("inst_load_u8", doTest("inst_load_u8"));
  it("inst_load_u8_trap", doTest("inst_load_u8_trap"));
});
