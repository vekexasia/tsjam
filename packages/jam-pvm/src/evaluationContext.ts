import { SeqOfLength, u32 } from "@vekexasia/jam-types";
import { PVMProgram } from "@/program.js";
import { PVMMemory } from "@/pvmMemory.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export type EvaluationContext = {
  instructionPointer: number;
  memory: typeof PVMMemory;
  program: PVMProgram;
  registers: SeqOfLength<u32, 13>;
};
