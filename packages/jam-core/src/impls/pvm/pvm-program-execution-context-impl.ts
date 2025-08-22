import { Gas, PVMProgramExecutionContext, u32 } from "@tsjam/types";
import type { PVMRegistersImpl } from "./pvm-registers-impl";
import { ConditionalExcept } from "type-fest";
import { PVMMemory } from "@/pvm/pvm-memory";
import { cloneCodecable } from "@tsjam/codec";

export class PVMProgramExecutionContextImpl
  implements PVMProgramExecutionContext
{
  /**
   * `ı`
   */
  instructionPointer!: u32;
  /**
   * `ξ`
   */
  gas!: Gas;
  /**
   * `ω`
   */
  registers!: PVMRegistersImpl;
  /**
   * `μ`
   */
  memory!: PVMMemory;
  constructor(
    config: ConditionalExcept<PVMProgramExecutionContextImpl, Function>,
  ) {
    Object.assign(this, config);
  }

  clone() {
    const toRet = new PVMProgramExecutionContextImpl(this);
    toRet.registers = cloneCodecable(this.registers);
    toRet.memory = this.memory.clone();
    return toRet;
  }
}
