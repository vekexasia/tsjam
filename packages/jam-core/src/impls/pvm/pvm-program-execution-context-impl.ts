import { Gas, PVMProgramExecutionContext, u32 } from "@tsjam/types";
import type { PVMRegistersImpl } from "./pvm-registers-impl";
import { ConditionalExcept } from "type-fest";
import { PVMMemory } from "@/pvm/pvm-memory";

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
}
