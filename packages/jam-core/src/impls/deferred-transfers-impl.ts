import {
  Balance,
  Dagger,
  Gas,
  Posterior,
  ServiceIndex,
  u32,
  Validated,
} from "@tsjam/types";
import { DeferredTransferImpl } from "./deferred-transfer-impl";
import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import { DeltaImpl } from "./delta-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { transferInvocation } from "@/pvm/invocations/onTransfer";
import { TauImpl } from "./slot-impl";

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

  /**
   * calculates bold_x
   * $(0.7.0 - 12.30)
   */
  invokedTransfers(deps: {
    d_delta: Dagger<DeltaImpl>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_eta_0: Posterior<JamEntropyImpl["_0"]>;
  }): InvokedTransfers {
    const bold_x: Map<
      ServiceIndex,
      ReturnType<typeof transferInvocation>
    > = new Map();

    for (const [serviceIndex] of deps.d_delta.elements) {
      bold_x.set(
        serviceIndex,
        transferInvocation(
          deps.d_delta,
          deps.p_tau,
          serviceIndex,
          this.byDestination(serviceIndex),
          {
            p_eta_0: deps.p_eta_0,
          },
        ),
      );
    }
    return bold_x;
  }

  /**
   * computes big bold X
   * $(0.7.0 - 12.34)
   *
   * @param invokedTransfers - bold_x
   */
  statistics(invokedTransfers: InvokedTransfers): TransferStatistics {
    const toRet = new Map<ServiceIndex, { count: u32; gasUsed: Gas }>();
    for (const [destService, { gasUsed /* u */ }] of invokedTransfers) {
      const r = this.byDestination(destService);
      if (r.length() > 0) {
        toRet.set(destService, {
          count: <u32>r.length(),
          // u
          gasUsed,
        });
      }
    }
    return toRet;
  }

  static newEmpty(): DeferredTransfersImpl {
    return new DeferredTransfersImpl([]);
  }
}

export type InvokedTransfers = Map<
  ServiceIndex,
  ReturnType<typeof transferInvocation>
>;

/**
 * `bold X`
 * $(0.7.0 - 12.33)
 */
export type TransferStatistics = Map<
  ServiceIndex,
  { count: u32; gasUsed: Gas }
>;
