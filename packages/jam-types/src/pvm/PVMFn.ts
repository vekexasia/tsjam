import {
  PVMProgramExecutionContextBase,
  PVMRefineContext,
} from "@/pvm/PVMProgramExecutionContext.js";
import { ServiceAccount } from "@/sets/ServiceAccount.js";
import { PVMResultContext } from "@/pvm/PVMResultContext.js";

/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface PVMFn<Args extends unknown[], Out extends object = object> {
  execute(
    context: {
      execution: PVMProgramExecutionContextBase;
    },
    ...args: Args
  ): PVMProgramExecutionContextBase & Out;
  gasCost: bigint;
}

export type GeneralPVMFn = PVMFn<
  [ServiceAccount],
  { serviceAccount: ServiceAccount }
>;

export type AccumulatePVMFn = PVMFn<
  [{ x: PVMResultContext; y: PVMResultContext }],
  { x: PVMResultContext; y: PVMResultContext }
>;

export type RefinePVMFn = PVMFn<
  [PVMRefineContext],
  { refineContext: PVMRefineContext }
>;
