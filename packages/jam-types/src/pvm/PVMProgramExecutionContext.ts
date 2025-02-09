import { IPVMMemory } from "@/pvm/IPVMMemory.js";
import { Gas, u32 } from "@/genericTypes.js";
import { PVMRegisters } from "./PVMRegisters";

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
  registers: PVMRegisters;
  /**
   * `μ`
   */
  memory: IPVMMemory;
}
