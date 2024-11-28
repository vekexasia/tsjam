import { IPVMMemory } from "@/pvm/IPVMMemory.js";
import { Gas, RegisterValue, SeqOfLength, u32 } from "@/genericTypes.js";

/**
 * This is the context passed to instructions for evaluation.
 *
 */
export interface PVMProgramExecutionContext
  extends PVMProgramExecutionContextBase {
  /**
   * `ı`
   */
  instructionPointer: u32;
}

export interface PVMProgramExecutionContextBase {
  /**
   * `ξ`
   */
  gas: Gas;
  /**
   * `ω`
   */
  registers: SeqOfLength<RegisterValue, 13>;
  /**
   * `μ`
   */
  memory: IPVMMemory;
}
