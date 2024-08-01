import { SeqOfLength, u32 } from "@vekexasia/jam-types";
import { PVMProgram } from "@/program.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export type EvaluationContext = {
  instructionPointer: number;
  memory: Uint8Array;
  program: PVMProgram;
  registers: SeqOfLength<u32, 13>;
};
