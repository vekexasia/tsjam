import { DeferredTransfer } from "./DeferredTransfer";
import { PVMAccumulationOp } from "./PVMAccumulationOp";

/**
 * `I` = U u X
 * $(0.7.1 - 12.15)
 */
export type AccumulationInput = {
  operand?: PVMAccumulationOp;
  transfer?: DeferredTransfer;
};
