import { PVMProgramExecutionContextBase } from "@/pvm/pvm-program-execution-context";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export type PVMFn<
  Args,
  Out,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
> = (context: CTX, args: Args) => Out;
