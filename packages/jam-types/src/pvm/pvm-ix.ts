import { Gas, u8 } from "@/generic-types";
import { IParsedProgram } from "@/pvm/i-parsed-program";
import { PVMProgramExecutionContext } from "@/pvm/pvm-program-execution-context";
import {
  PVMExitReasonMod,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModPointer,
  PVMSingleModRegister,
} from "./pvm-modifications";
import { RegisterIdentifier } from "./register-identifier";
import { PVMExitReason } from "./pvm-exit-reason";
export type PVMIxReturnMods = Array<
  | PVMSingleModPointer
  | PVMSingleModGas
  | PVMSingleModMemory
  | PVMSingleModRegister<RegisterIdentifier>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | PVMExitReasonMod<any>
>;

export type PVMIxEvaluateFNContext = {
  execution: PVMProgramExecutionContext;
  program: IParsedProgram;
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
  decode(bytes: Uint8Array): Args;

  evaluate(
    args: Args,
    context: PVMIxEvaluateFNContext,
    skip: number,
  ): PVMExitReason | void;
  readonly gasCost: Gas;
  readonly opCode: u8;
  readonly identifier: string;
}

export type PVMIxEvaluateFN<Args> = PVMIx<Args>["evaluate"];

export type PVMIxDecodeFN<Args> = PVMIx<Args>["decode"];
