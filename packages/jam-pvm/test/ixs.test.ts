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
import { PVMMemory } from "@/pvmMemory.js";

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
    context.execution.memory = new PVMMemory(
      json["initial-memory"].map(
        (v: { address: number; contents: number[] }) => ({
          at: v.address,
          content: new Uint8Array(v.contents),
        }),
      ),
      json["initial-page-map"].map(
        (v: { address: number; length: number; "is-writable": boolean }) => ({
          from: v.address,
          to: v.address + v.length,
          writable: v["is-writable"],
        }),
      ),
    );
    context.execution.gas = toTagged(BigInt(json["initial-gas"]));
    context.execution.instructionPointer = toTagged(json["initial-pc"]);
    context.execution.registers = json["initial-regs"];

    const program = PVMProgramCodec.decode(new Uint8Array(json.program));
    context.program = program.value;
    context.parsedProgram = ParsedProgram.parse(program.value);
    const r = runProgramSTF.apply(
      {
        parsedProgram: ParsedProgram.parse(program.value),
        program: program.value,
      },
      context.execution,
    );
    expect(r.context.registers).toEqual(json["expected-regs"]);
    expect(r.context.instructionPointer).toEqual(json["expected-pc"]);
    expect(
      r.exitReason == RegularPVMExitReason.Panic
        ? "trap"
        : RegularPVMExitReason.Halt == r.exitReason
          ? "halt"
          : 0,
    ).toEqual(json["expected-status"]);
    for (const { address, contents } of json["expected-memory"]) {
      expect(r.context.memory.getBytes(address, contents.length)).toEqual(
        new Uint8Array(contents),
      );
    }
    expect(r.context.gas).toEqual(toTagged(BigInt(json["expected-gas"])));
  };
  // read all fixtures directory
  const files = fs.readdirSync(`${__dirname}/fixtures`);
  for (const file of files) {
    it(file, doTest(file.replace(".json", "")));
  }
});
