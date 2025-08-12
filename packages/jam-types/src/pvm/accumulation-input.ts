import { DeferredTransfer } from "./deferred-transfer";
import { PVMAccumulationOp } from "./pvm-accumulation-op";

/**
 * `I` = U u X
 * $(0.7.1 - 12.15)
 */
export type AccumulationInput = {
  operand?: PVMAccumulationOp;
  transfer?: DeferredTransfer;
};
