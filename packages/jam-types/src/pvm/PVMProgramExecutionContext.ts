import { IPVMMemory } from "@/pvm/IPVMMemory.js";
import { ByteArrayOfLength, SeqOfLength, u32, u64 } from "@/genericTypes.js";
import { Tau } from "@/Tau.js";

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

export interface AccumulateHostFNContext
  extends PVMProgramExecutionContextBase {
  tau: Tau;
}
/**
 * Defined in B.8
 */
export interface PVMRefineContext {
  m: Map<number, IPVMMemory>;
  e: ByteArrayOfLength<6>[];
}
