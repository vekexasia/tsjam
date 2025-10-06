import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import { Balance, Gas, ServiceIndex } from "@tsjam/types";
import { DeferredTransferImpl } from "./deferred-transfer-impl";

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

  totalGas(): Gas {
    return <Gas>this.elements.reduce((acc, a) => acc + a.gas, 0n);
  }

  length(): number {
    return this.elements.length;
  }

  /**
   * $(0.7.0 - 12.29) | X
   */
  byDestination(destination: ServiceIndex) {
    return new DeferredTransfersImpl(
      this.elements
        .slice()
        .sort((a, b) => {
          if (a.source === b.source) {
            return a.destination - b.destination;
          }
          return a.source - b.source;
        })
        .filter((t) => t.destination === destination),
    );
  }

  static newEmpty(): DeferredTransfersImpl {
    return new DeferredTransfersImpl([]);
  }
}
