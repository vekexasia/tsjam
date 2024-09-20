import { PVMExitReason } from "@/pvm/PVMExitReason.js";
import { PVMProgramExecutionContext } from "@/pvm/PVMProgramExecutionContext.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";
import { IParsedProgram } from "@/pvm/IParsedProgram.js";
import { u32, u64 } from "@/genericTypes.js";
import { RegisterIdentifier } from "@/pvm/RegisterIdentifier.js";

export type IxSingleMod<T, K> = { type: T; data: K };
export type IxSingleModGas = IxSingleMod<"gas", u64>;
export type IxSingleModPointer = IxSingleMod<"ip", u32>;
export type IxSingleModMemory = IxSingleMod<
  "memory",
  { from: u32; data: Uint8Array }
>;
export type IxSingleModRegister = IxSingleMod<
  "register",
  { index: RegisterIdentifier; value: u32 }
>;
export type IxSingleModExit = IxSingleMod<"exit", PVMExitReason>;
export type IxModification =
  | IxSingleModPointer
  | IxSingleModGas
  | IxSingleModMemory
  | IxSingleModRegister
  | IxSingleModExit;
/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMIx<Args extends unknown[]> {
  /**
   * decode the full instruction from the bytes.
   * the byte array is chunked to include only the bytes of the instruction (included opcode)
   * @param bytes
   */
  decode(bytes: Uint8Array): Args;

  evaluate(
    context: {
      execution: PVMProgramExecutionContext;
      program: PVMProgram;
      parsedProgram: IParsedProgram;
    },
    ...args: Args
  ): IxModification[];

  gasCost: bigint;
}

export type PVMIxEvaluateFN<Args extends unknown[]> = PVMIx<Args>["evaluate"];
