import { SeqOfLength, u32 } from "@vekexasia/jam-types";
import { PVMMemory } from "@/pvm/PVMMemory.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface EvaluationContext {
  instructionPointer: u32;
  memory: PVMMemory;
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
    ixSkips: Map<u32, u32>;
  };
  registers: SeqOfLength<u32, 13>;
}
