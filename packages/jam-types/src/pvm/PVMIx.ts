import { Result } from "neverthrow";
import { PVMProgramExecutionContext } from "@/pvm/PVMProgramExecutionContext.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";
import { IParsedProgram } from "@/pvm/IParsedProgram.js";
import { PVMModification } from "@/pvm/PVMModifications.js";
import { PVMExitReason } from "@/pvm/PVMExitReason.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMIx<
  Args extends unknown[],
  EvaluateErr extends PVMIxExecutionError,
  DecodeErr = PVMIxDecodeError,
> {
  /**
   * decode the full instruction from the bytes.
   * the byte array is chunked to include only the bytes of the instruction (included opcode)
   */
  decode(bytes: Uint8Array): Result<Args, DecodeErr>;

  evaluate(
    context: {
      execution: PVMProgramExecutionContext;
      program: PVMProgram;
      parsedProgram: IParsedProgram;
    },
    ...args: Args
  ): Result<PVMModification[], EvaluateErr>;

  readonly gasCost: bigint;
  readonly opCode: number;
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
    public readonly mods: PVMModification[],
    public type: PVMExitReason,
    public reason: string,
  ) {}
}

export type PVMIxEvaluateFN<
  Args extends unknown[],
  EvErr extends PVMIxExecutionError = PVMIxExecutionError,
> = PVMIx<Args, EvErr>["evaluate"];
