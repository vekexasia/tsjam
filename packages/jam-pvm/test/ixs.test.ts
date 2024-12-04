import "@/instructions/index.js";
import { describe, expect, it } from "vitest";
import { Ixdb } from "@/instructions/ixdb.js";
import * as fs from "node:fs";
import { createEvContext } from "@/test/mocks.js";
import { toTagged } from "@tsjam/utils";
import { PVMProgramCodec } from "@tsjam/codec";
import { ParsedProgram } from "@/parseProgram.js";
import { basicInvocation } from "@/invocations/basic.js";
import { Gas, RegularPVMExitReason } from "@tsjam/types";
import { PVMMemory } from "@/pvmMemory.js";

describe.skip("testcases", () => {
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
    context.execution.gas = toTagged(BigInt(json["initial-gas"]) as Gas);
    context.execution.instructionPointer = toTagged(json["initial-pc"]);
    context.execution.registers = json["initial-regs"];

    const program = PVMProgramCodec.decode(new Uint8Array(json.program));
    context.program = program.value;
    context.parsedProgram = ParsedProgram.parse(program.value);
    const r = basicInvocation(
      {
        parsedProgram: ParsedProgram.parse(program.value),
        program: program.value,
      },
      context.execution,
    );
    expect(r.context.registers).toEqual(json["expected-regs"]);
    expect(
      r.exitReason == RegularPVMExitReason.Panic
        ? "trap"
        : RegularPVMExitReason.Halt == r.exitReason
          ? "halt"
          : 0,
    ).toEqual(json["expected-status"]);
    expect(r.context.instructionPointer, "instruction pointer").toEqual(
      json["expected-pc"],
    );
    for (const { address, contents } of json["expected-memory"]) {
      expect(r.context.memory.getBytes(address, contents.length)).toEqual(
        new Uint8Array(contents),
      );
    }
    expect(r.context.gas).toEqual(toTagged(BigInt(json["expected-gas"])));
  };
  // read all fixtures directory
  // TODO: restore when test cases are available
  // const files = fs.readdirSync(`${__dirname}/fixtures`).filter(() => {
  //   return true; //a.startsWith("inst_load_u8_trap");
  // });

  // for (const file of files) {
  //   it(file, doTest(file.replace(".json", "")));
  // }
});
