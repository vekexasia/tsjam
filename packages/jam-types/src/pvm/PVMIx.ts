import { Result } from "neverthrow";
import { PVMProgramExecutionContext } from "@/pvm/PVMProgramExecutionContext.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";
import { IParsedProgram } from "@/pvm/IParsedProgram.js";
import { PVMExitReason } from "@/pvm/PVMExitReason.js";
import { Gas, u8 } from "@/genericTypes";
import { RegisterIdentifier } from "./RegisterIdentifier";
import {
  PVMSingleModPointer,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModRegister,
  PVMExitPanicMod,
} from "./PVMModifications";
export type PVMIxReturnMods = Array<
  | PVMSingleModPointer
  | PVMSingleModGas
  | PVMSingleModMemory
  | PVMSingleModRegister<RegisterIdentifier>
  | PVMExitPanicMod
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
export interface PVMIx<Args, EvaluateErr extends PVMIxExecutionError> {
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

/**
 * Represents an error indecoding pvm instruction
 */
export class PVMIxDecodeError {
  constructor(public message: string) {}
}

/**
 * Base class for PVM Execution Error
 */
export class PVMIxExecutionError {
  constructor(
    public readonly mods: Array<
      | PVMSingleModPointer
      | PVMSingleModGas
      | PVMSingleModMemory
      | PVMSingleModRegister<RegisterIdentifier>
    >,
    public readonly type: PVMExitReason,
    public readonly reason: string,
    public readonly accountTrapCost: boolean,
  ) {}
}

export type PVMIxEvaluateFN<
  Args,
  EvErr extends PVMIxExecutionError = PVMIxExecutionError,
> = PVMIx<Args, EvErr>["evaluate"];

export type PVMIxDecodeFN<Args> = PVMIx<Args, any>["decode"];
