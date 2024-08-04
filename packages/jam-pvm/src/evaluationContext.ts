import { SeqOfLength, u32, u8 } from "@vekexasia/jam-types";
import { PVMProgram } from "@/program.js";
import { PVMMemory } from "@/pvmMemory.js";
import { Ixdb } from "@/instructions/ixdb.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export type EvaluationContext = {
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
};

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
