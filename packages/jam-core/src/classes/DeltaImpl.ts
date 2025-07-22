import { BaseJamCodecable, JamCodecable } from "@tsjam/codec";
import { Delta, ServiceIndex } from "@tsjam/types";
import { ServiceAccountImpl } from "./ServiceAccountImpl";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.0 - 9.2)
 */
@JamCodecable()
export class DeltaImpl extends BaseJamCodecable implements Delta {
  elements!: Map<ServiceIndex, ServiceAccountImpl>;
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
}
