import { Gas } from "@/genericTypes";
import { PVMProgramExecutionContextBase } from "@/pvm/PVMProgramExecutionContext.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMFn<
  Args extends unknown[],
  Out,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
> {
  execute(context: CTX, ...args: Args): Out;
  gasCost: Gas | ((ctx: CTX, ...args: Args) => Gas);
  opCode: number;
  identifier: string;
}
