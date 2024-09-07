import { SeqOfLength, u32 } from "@vekexasia/jam-types";
import { PVMMemory } from "@/pvm/PVMMemory.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface PVMProgramExecutionContext {
  instructionPointer: u32;
  gas: u32;
  memory: PVMMemory;
  registers: SeqOfLength<u32, 13>;
}
