import { Balance, Gas } from "@tsjam/types";
import { DeferredTransferImpl } from "./deferred-transfer-impl";
import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";

/**
 * $(0.7.1 - 12.14)
 */
@JamCodecable()
export class DeferredTransfersImpl extends BaseJamCodecable {
  @lengthDiscriminatedCodec(DeferredTransferImpl)
  elements: DeferredTransferImpl[];

  constructor(elements?: DeferredTransferImpl[]) {
    super();
    if (typeof elements === "undefined") {
      this.elements = [];
    } else {
      this.elements = elements;
    }
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

  static newEmpty(): DeferredTransfersImpl {
    return new DeferredTransfersImpl([]);
  }
}
