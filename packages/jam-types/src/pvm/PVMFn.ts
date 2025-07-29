import { PVMProgramExecutionContextBase } from "@/pvm/PVMProgramExecutionContext.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export type PVMFn<
  Args extends unknown,
  Out,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
> = (context: CTX, args: Args) => Out;
