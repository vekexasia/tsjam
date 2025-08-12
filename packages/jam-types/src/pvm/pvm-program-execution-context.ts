import { IPVMMemory } from "@/pvm/ipvm-memory";
import { Gas, u32 } from "@/generic-types";
import { PVMRegisters } from "./pvm-registers";

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
