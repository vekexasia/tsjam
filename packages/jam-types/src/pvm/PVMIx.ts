import { PVMProgramExecutionContext } from "@/pvm/PVMProgramExecutionContext.js";
import { PVMProgram } from "@/pvm/PVMProgram.js";
import { IParsedProgram } from "@/pvm/IParsedProgram.js";
import { PVMModification } from "@/pvm/PVMModifications.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMIx<Args extends unknown[]> {
  /**
   * decode the full instruction from the bytes.
   * the byte array is chunked to include only the bytes of the instruction (included opcode)
   */
  decode(bytes: Uint8Array): Args;

  evaluate(
    context: {
      execution: PVMProgramExecutionContext;
      program: PVMProgram;
      parsedProgram: IParsedProgram;
    },
    ...args: Args
  ): PVMModification[];

  gasCost: bigint;
}

export type PVMIxEvaluateFN<Args extends unknown[]> = PVMIx<Args>["evaluate"];
