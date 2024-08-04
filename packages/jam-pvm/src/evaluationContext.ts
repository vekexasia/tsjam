import { SeqOfLength, u32, u8 } from "@vekexasia/jam-types";
import { PVMProgram } from "@/program.js";
import { PVMMemory } from "@/pvmMemory.js";
import { Ixdb } from "@/instructions/ixdb.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface EvaluationContext {
  instructionPointer: u32;
  memory: typeof PVMMemory;
  program: PVMProgram;
  meta: {
    /**
     * the set of instruction indexes that are the start of a block
     * defined by ϖ in the graypaper
     */
    blockBeginnings: Set<u32>;
    /**
     * the length of each block in the program
     * key is the `ix` index
     * value is the length of bytes till the next `ix` index
     *
     * not including the ix index itself
     * basically its the `skip()` function
     *
     */
    blockLengths: Map<u32, u32>;
  };
  registers: SeqOfLength<u32, 13>;
}
/**
 * Instantiate a new evaluation context given the PVM Program
 * @param program - the PVM Program
 */
export const instantiateContext = (program: PVMProgram): EvaluationContext => {
  const meta: EvaluationContext["meta"] = {
    blockBeginnings: new Set<u32>(),
    blockLengths: new Map<u32, u32>(),
  };

  let lastIx = 0 as u32;
  let prevWasTerminator = false;
  for (let i = 0; i < program.k.length; i++) {
    // if this is an instruction opcode
    if (program.k[i] === 1) {
      // basically the skips
      meta.blockLengths.set(lastIx, (i - lastIx - 1) as u32);
      lastIx = i as u32;
      if (prevWasTerminator) {
        meta.blockBeginnings.add(i as u32);
      }
      prevWasTerminator = Ixdb.blockTerminators.has(program.c[i] as u8);
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
        k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        z: 0 as u8,
      };
      const context = instantiateContext(program);
      expect(context.instructionPointer).toBe(0);
      expect(context.memory).toBe(PVMMemory);
      expect(context.program).toBe(program);
      expect(context.meta.blockBeginnings.size).toBe(0);
      expect(context.meta.blockLengths.size).toBe(0);
      expect(context.registers.length).toBe(13);
    });
  });
}
