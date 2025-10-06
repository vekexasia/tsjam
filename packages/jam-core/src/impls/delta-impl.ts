import { Hashing } from "@tsjam/crypto";
import {
  Dagger,
  Delta,
  DoubleDagger,
  Posterior,
  ServiceIndex,
  Tagged,
  u32,
  Validated,
} from "@tsjam/types";
import { toDagger, toDoubleDagger, toPosterior, toTagged } from "@tsjam/utils";
import type { AccumulationStatisticsImpl } from "./accumulation-statistics-impl";
import type { PreimagesExtrinsicImpl } from "./extrinsics/preimages";
import { PVMResultContextImpl } from "./pvm/pvm-result-context-impl";
import { ServiceAccountImpl } from "./service-account-impl";
import type { TauImpl } from "./slot-impl";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.1 - 9.2)
 */
export class DeltaImpl implements Delta {
  elements!: Map<ServiceIndex, ServiceAccountImpl>;
  constructor(el?: Map<ServiceIndex, ServiceAccountImpl>) {
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
    clone.elements = new Map(
      [...this.elements].map(([si, s]) => [si, s.clone()]),
    );
    return clone;
  }

  delete(key: ServiceIndex): boolean {
    return this.elements.delete(key);
  }

  /**
   * $(0.7.1 - 12.21) - \fnprovide
   * also `P()` fn
   * @returns a new DeltaImpl with the preimages integrated
   */
  preimageIntegration(
    provisions: PVMResultContextImpl["provisions"],
    p_tau: Validated<Posterior<TauImpl>>,
  ) {
    const newD = this.clone();
    for (const { serviceId, blob } of provisions) {
      const phash = Hashing.blake2b(blob);
      const plength: Tagged<u32, "length"> = toTagged(<u32>blob.length);
      if (this.get(serviceId)?.requests.get(phash, plength)?.length === 0) {
        newD
          .get(serviceId)!
          .requests.set(phash, plength, toTagged(<TauImpl[]>[p_tau]));
        newD.get(serviceId)!.preimages.set(phash, blob);
      }
    }
    return newD;
  }

  /**
   * $(0.7.1 - 12.28 / 12.29)
   */
  toDoubleDagger(
    this: Dagger<DeltaImpl>,
    deps: {
      /**
       * `bold S`
       */
      accumulationStatistics: AccumulationStatisticsImpl;
      p_tau: Validated<Posterior<TauImpl>>;
    },
  ): DoubleDagger<DeltaImpl> {
    const dd_delta = this.clone();
    for (const serviceIndex of deps.accumulationStatistics.services()) {
      const a = dd_delta.get(serviceIndex)!;
      a.lastAcc = deps.p_tau;
      dd_delta.set(serviceIndex, a);
    }
    return toDoubleDagger(toDagger(dd_delta));
  }

  /**
   * $(0.7.1 - 12.36)
   */
  toPosterior(
    this: DoubleDagger<DeltaImpl>,
    deps: {
      ep: Validated<PreimagesExtrinsicImpl>;
      p_tau: Validated<Posterior<TauImpl>>;
    },
  ): Posterior<DeltaImpl> {
    const p = deps.ep.elements.filter((ep) =>
      this.get(ep.requester)!.isPreimageSolicitedButNotYetProvided(
        Hashing.blake2b(ep.blob),
        ep.blob.length,
      ),
    );

    const result = this.clone();
    for (const { requester, blob } of p) {
      const x = result.get(requester)!;
      x.preimages = x.preimages.clone();

      const hash = Hashing.blake2b(blob);
      x.preimages.set(hash, blob);

      x.requests.set(hash, toTagged(<u32>blob.length), toTagged([deps.p_tau]));
    }
    return toPosterior(result);
  }

  static union(a: DeltaImpl, b: DeltaImpl): DeltaImpl {
    return new DeltaImpl(new Map([...a.elements, ...b.elements]));
  }

  static newEmpty() {
    return new DeltaImpl(new Map());
  }
}
