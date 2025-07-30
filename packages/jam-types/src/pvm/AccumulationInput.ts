import { DeferredTransfer } from "./DeferredTransfer";
import { PVMAccumulationOp } from "./PVMAccumulationOp";

/**
 * `I` = U u X
 */
export type AccumulationInput = {
  operand?: PVMAccumulationOp;
  transfer?: DeferredTransfer;
};
