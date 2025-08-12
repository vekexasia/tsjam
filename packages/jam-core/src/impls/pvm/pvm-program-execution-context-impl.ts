import { PVMMemory } from "@/pvm";
import { Gas, PVMProgramExecutionContext, u32 } from "@tsjam/types";
import { PVMRegistersImpl } from "./pvm-registers-impl";
import { ConditionalExcept } from "type-fest";

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
