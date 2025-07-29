import { PVMProgramExecutionContext } from "@/pvm/PVMProgramExecutionContext.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";
import { IParsedProgram } from "@/pvm/IParsedProgram.js";
import { Gas, u8 } from "@/genericTypes";
import { RegisterIdentifier } from "./RegisterIdentifier";
import {
  PVMSingleModPointer,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModRegister,
  PVMExitReasonMod,
} from "./PVMModifications";
export type PVMIxReturnMods = Array<
  | PVMSingleModPointer
  | PVMSingleModGas
  | PVMSingleModMemory
  | PVMSingleModRegister<RegisterIdentifier>
  | PVMExitReasonMod
>;

export type PVMIxEvaluateFNContext = {
  execution: PVMProgramExecutionContext;
  program: PVMProgram;
  parsedProgram: IParsedProgram;
};
/**
 * * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMIx<Args> {
  /**
   * decode the full instruction from the bytes.
   * the byte array is chunked to include only the bytes of the instruction (included opcode)
   */
  decode(bytes: Uint8Array, context: PVMIxEvaluateFNContext): Args;

  evaluate(args: Args, context: PVMIxEvaluateFNContext): PVMIxReturnMods;
  readonly gasCost: Gas;
  readonly opCode: u8;
  readonly identifier: string;
}

export type PVMIxEvaluateFN<Args> = PVMIx<Args>["evaluate"];

export type PVMIxDecodeFN<Args> = PVMIx<Args>["decode"];
