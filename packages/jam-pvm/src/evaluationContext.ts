import {
  EvaluationContext,
  PVMProgram,
  SeqOfLength,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { PVMMemory } from "@/pvmMemory.js";
import { Ixdb } from "@/instructions/ixdb.js";
import assert from "node:assert";

/**
 * Instantiate a new evaluation context given the PVM Program
 * @param program - the PVM Program
 */
export const instantiateContext = (program: PVMProgram): EvaluationContext => {
  const meta: EvaluationContext["meta"] = {
    blockBeginnings: new Set<u32>(),
    ixSkips: new Map<u32, u32>(),
  };

  assert(
    program.k[0] === 1 && Ixdb.byCode.has(program.c[0] as u8),
    "First instruction must be an instruction",
  );
  let lastIx = 0 as u32;
  for (let i = 1; i < program.k.length; i++) {
    // if this is an instruction opcode
    if (program.k[i] === 1) {
      // basically the skips
      meta.ixSkips.set(lastIx, (i - lastIx - 1) as u32);
      lastIx = i as u32;
    }
  }
  meta.ixSkips.set(lastIx, (program.k.length - lastIx - 2) as u32);
  meta.blockBeginnings.add(0 as u32);
  for (const [ix, skip] of meta.ixSkips.entries()) {
    if (Ixdb.blockTerminators.has(program.c[ix] as u8)) {
      meta.blockBeginnings.add((ix + skip + 1) as u32);
    }
  }

  return {
    instructionPointer: 0 as u32,
    memory: PVMMemory,
    program,
    meta,
    registers: new Array(13).fill(0) as SeqOfLength<u32, 13>,
  };
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  await import("@/instructions/index.js");
  describe("instantiateContext", () => {
    it("should instantiate the context", () => {
      const program: PVMProgram = {
        c: new Uint8Array([
          0x04,
          0x07,
          0x0a, // a0 = 0x0a
          0x04,
          0x08,
          0xf6, // a1 = 0xfffffff6
          0x2b,
          0x87,
          0x04, // jump 10 if a0 >=signed a1 - branch_ge_s
          0x00, // trap,
          0x04,
          0x07,
          0xef,
          0xbe,
          0xad,
          0xde, // load_imm a0 0xdeadbeef
        ]),
        j: [] as any,
        k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        z: 0 as u8,
      };
      const context = instantiateContext(program);
      expect(context.instructionPointer).toBe(0);
      expect(context.memory).toBe(PVMMemory);
      expect(context.program).toBe(program);
      expect([...context.meta.ixSkips.entries()]).toEqual([
        [0, 2],
        [3, 2],
        [6, 2],
        [9, 0],
        [10, 5],
      ]);
      expect([...context.meta.blockBeginnings]).toEqual([0, 9, 10]);
      expect(context.registers.length).toBe(13);
      expect(context.registers).toEqual(new Array(13).fill(0));
    });
    it("should fail if no ix valid at index 0", () => {
      const program: PVMProgram = {
        c: new Uint8Array([0x64, 0x07, 0x0a]),
        j: [] as any,
        k: [1, 0, 0],
        z: 0 as u8,
      };
      expect(() => instantiateContext(program)).toThrow(
        "First instruction must be an instruction",
      );
    });
    it("should fail if k[0] is not 1", () => {
      const program: PVMProgram = {
        c: new Uint8Array([0x04, 0x07, 0x0a]),
        j: [] as any,
        k: [0, 0, 0],
        z: 0 as u8,
      };
      expect(() => instantiateContext(program)).toThrow(
        "First instruction must be an instruction",
      );
    });
  });
}
