import { transferInvocation } from "@/pvm";
import {
  Balance,
  Dagger,
  Gas,
  InvokedTransfers,
  Posterior,
  ServiceIndex,
  Tau,
  u32,
} from "@tsjam/types";
import { DeferredTransferImpl } from "./DeferredTransferImpl";
import { DeltaImpl } from "./DeltaImpl";
import { InvokedTransfersImpl } from "./InvokedTransfersImpl";

export class DeferredTransfersImpl {
  elements: DeferredTransferImpl[];

  constructor(elements: DeferredTransferImpl[]) {
    this.elements = elements;
  }

  /**
   * Filters out elements that are meant for a specific service
   * $(0.7.0 - 12.29 | X
   */
  forDestination(service: ServiceIndex) {
    return this.elements
      .filter((t) => t.destination === service)
      .sort((a, b) => a.source - b.source);
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

  /**
   * computes big bold X
   * ${0.7.0 - 12.33 / 12.34}
   */
  computeStatistics(
    invokedTransfers: InvokedTransfers,
  ): Map<ServiceIndex, { count: u32; gasUsed: Gas }> {
    const toRet = new Map<ServiceIndex, { count: u32; gasUsed: Gas }>();
    for (const [destService, { gasUsed }] of invokedTransfers.elements) {
      const r = this.forDestination(destService);
      if (r.length > 0) {
        toRet.set(destService, {
          count: <u32>r.length,
          // u
          gasUsed,
        });
      }
    }
    return toRet;
  }

  /**
   * computes bold_x
   * $(0.7.0 - 12.30)
   */
  invokeOnTransfer(deps: {
    d_delta: Dagger<DeltaImpl>;
    p_tau: Posterior<Tau>;
  }) {
    const x: InvokedTransfersImpl = new InvokedTransfersImpl({
      elements: new Map(),
    });

    for (const [serviceIndex] of deps.d_delta.elements) {
      x.set(
        serviceIndex,
        transferInvocation(
          deps.d_delta,
          deps.p_tau,
          serviceIndex,
          new DeferredTransfersImpl(this.forDestination(serviceIndex)),
        ),
      );
    }
    return { invokedTransfers: x, stats: this.computeStatistics(x) };
  }
}
