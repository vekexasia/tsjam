import { Balance, Gas } from "@tsjam/types";
import { DeferredTransferImpl } from "./DeferredTransferImpl";

export class DeferredTransfersImpl {
  elements: DeferredTransferImpl[];

  constructor(elements: DeferredTransferImpl[]) {
    this.elements = elements;
  }

  totalAmount(): Balance {
    return <Balance>this.elements.reduce((acc, a) => acc + a.amount, 0n);
  }
  totalGasUsed(): Gas {
    return <Gas>this.elements.reduce((acc, a) => acc + a.gas, 0n);
  }

  length(): number {
    return this.elements.length;
  }
}
