import { IPVMMemory } from "@/pvm/IPVMMemory.js";
import { SeqOfLength, u32, u64 } from "@/genericTypes.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface PVMProgramExecutionContext {
  instructionPointer: u32;
  gas: u64;
  memory: IPVMMemory;
  registers: SeqOfLength<u32, 13>;
}
