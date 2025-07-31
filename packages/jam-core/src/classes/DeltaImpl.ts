import { BaseJamCodecable, JamCodecable } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  Dagger,
  Delta,
  DoubleDagger,
  Posterior,
  ServiceIndex,
  Tau,
  u32,
  Validated,
} from "@tsjam/types";
import { toDagger, toDoubleDagger, toPosterior, toTagged } from "@tsjam/utils";
import { AccumulationStatisticsImpl } from "./AccumulationStatisticsImpl";
import { InvokedTransfersImpl } from "./InvokedTransfersImpl";
import { ServiceAccountImpl } from "./ServiceAccountImpl";
import { PreimagesExtrinsicImpl } from "./extrinsics/preimages";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.1 - 9.2)
 */
@JamCodecable()
export class DeltaImpl extends BaseJamCodecable implements Delta {
  elements!: Map<ServiceIndex, ServiceAccountImpl>;
  constructor(el?: Map<ServiceIndex, ServiceAccountImpl>) {
    super();
    this.elements = el ?? new Map<ServiceIndex, ServiceAccountImpl>();
  }
  services(): Set<ServiceIndex> {
    return new Set(this.elements.keys());
  }
  has(key: ServiceIndex): boolean {
    return this.elements.has(key);
  }
  get(key: ServiceIndex): ServiceAccountImpl | undefined {
    return this.elements.get(key);
  }
  set(key: ServiceIndex, value: ServiceAccountImpl): this {
    this.elements.set(key, value);
    return this;
  }
  clone(): DeltaImpl {
    const clone = new DeltaImpl();
    clone.elements = new Map(this.elements);
    return clone;
  }
  delete(key: ServiceIndex): boolean {
    return this.elements.delete(key);
  }

  /**
   * $(0.7.0 - 12.31 / 12.32)
   */
  static toDoubleDagger(
    d_delta: Dagger<DeltaImpl>,
    deps: {
      bold_x: InvokedTransfersImpl;
      /**
       * `bold S`
       */
      accumulationStatistics: AccumulationStatisticsImpl;
      p_tau: Posterior<Tau>;
    },
  ): DoubleDagger<DeltaImpl> {
    const dd_delta = new DeltaImpl();
    for (const serviceIndex of d_delta.services()) {
      let a = deps.bold_x.for(serviceIndex)!.account;
      if (deps.accumulationStatistics.has(serviceIndex)) {
        a = structuredClone(a);
        a.lastAcc = deps.p_tau;
      }
      dd_delta.set(serviceIndex, a);
    }
    return toDoubleDagger(toDagger(dd_delta));
  }

  static toPosterior(
    dd_delta: DoubleDagger<DeltaImpl>,
    deps: {
      ep: Validated<PreimagesExtrinsicImpl>;
      p_tau: Posterior<Tau>;
    },
  ): Posterior<DeltaImpl> {
    // $(0.7.0 - 12.42)
    const p = deps.ep.elements.filter((ep) =>
      dd_delta
        .get(ep.requester)!
        .isPreimageSolicitedButNotYetProvided(
          Hashing.blake2b(ep.blob),
          ep.blob.length,
        ),
    );

    const result = structuredClone(dd_delta);
    // $(0.7.0 - 12.43)
    for (const { requester, blob } of p) {
      const x = result.get(requester)!;

      const hash = Hashing.blake2b(blob);
      x.preimages.set(hash, blob);

      x.requests.set(hash, x.requests.get(hash) ?? new Map());
      x.requests
        .get(hash)!
        .set(toTagged(<u32>blob.length), toTagged([deps.p_tau]));
    }
    return toPosterior(result);
  }

  static union(a: DeltaImpl, b: DeltaImpl): DeltaImpl {
    return new DeltaImpl(new Map([...a.elements, ...b.elements]));
  }
}
