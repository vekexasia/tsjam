import { AccumulationInput } from "@tsjam/types";
import { PVMAccumulationOpImpl } from "./PVMAccumulationOPImpl";
import { DeferredTransferImpl } from "../DeferredTransferImpl";
import { ConditionalExcept } from "type-fest";

/**
 * $(0.7.1 - 12.15)
 */
export class AccumulationInputInpl implements AccumulationInput {
  operand?: PVMAccumulationOpImpl;
  transfer?: DeferredTransferImpl;
  constructor(config: ConditionalExcept<AccumulationInputInpl, Function>) {
    Object.assign(this, config);
  }

  isTransfer() {
    return this.transfer !== undefined;
  }
  isOperand() {
    return this.operand !== undefined;
  }
}
