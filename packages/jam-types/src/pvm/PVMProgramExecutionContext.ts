import { IPVMMemory } from "@/pvm/IPVMMemory.js";
import { SeqOfLength, u32, u64 } from "@/genericTypes.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface PVMProgramExecutionContext {
  /**
   * `ı`
   */
  instructionPointer: u32;
  /**
   * `ξ`
   */
  gas: u64;
  /**
   * `ω`
   */
  registers: SeqOfLength<u32, 13>;
  /**
   * `μ`
   */
  memory: IPVMMemory;
}
