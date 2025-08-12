import {
  ArrayOfJSONCodec,
  codec,
  createArrayLengthDiscriminator,
  JamCodec,
  JSONCodec,
  mapCodec,
  SINGLE_ELEMENT_CLASS,
  ZipJSONCodecs,
} from "@tsjam/codec";
import { ByteArrayOfLength } from "@tsjam/types";
import { uncheckedConverter } from "@vekexasia/bigint-uint8array";
import { compareUint8Arrays } from "uint8array-extras";
import { isSafeKey, SafeKey } from "./safe-key";

export class IdentitySet<T extends Uint8Array> implements Set<T> {
  private internalSet: Set<SafeKey> = new Set();
  private keyLookupMap: Map<SafeKey, T> = new Map();

  readonly [Symbol.toStringTag]: string = "IdentitySet";

  constructor(values?: ReadonlyArray<T> | null) {
    if (values) {
      for (const value of values) {
        this.add(value);
      }
    }
  }

  private getInternalKey(value: T): SafeKey {
    if (isSafeKey(value)) {
      return value;
    }

    return uncheckedConverter.arrayToLittleEndian(value);
  }

  lookupValue(key: SafeKey): T {
    if (this.keyLookupMap.has(key)) {
      return this.keyLookupMap.get(key)!;
    }
    throw new Error("lookupValue called with unknown key");
  }

  add(value: T): this {
    const internalKey = this.getInternalKey(value);
    this.internalSet.add(internalKey);
    this.keyLookupMap.set(internalKey, value);
    return this;
  }

  has(value: T): boolean {
    const internalKey = this.getInternalKey(value);
    return this.internalSet.has(internalKey);
  }

  delete(value: T): boolean {
    const internalKey = this.getInternalKey(value);
    const toRet = this.internalSet.delete(internalKey);
    return this.keyLookupMap.delete(internalKey) && toRet;
  }

  clear(): void {
    this.internalSet.clear();
    this.keyLookupMap.clear();
  }

  get size(): number {
    return this.internalSet.size;
  }

  keys(): IterableIterator<T> {
    return [...this.internalSet.keys()]
      .map((k) => this.lookupValue(k))
      .values();
  }

  values(): IterableIterator<T> {
    return this.keys();
  }

  entries(): IterableIterator<[T, T]> {
    return [...this.internalSet.keys()]
      .map<[T, T]>((k) => {
        const value = this.lookupValue(k);
        return [value, value];
      })
      .values();
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown,
  ): void {
    this.internalSet.forEach((key) => {
      const value = this.lookupValue(key);
      callbackfn.call(thisArg, value, value, this);
    });
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }
}

export const IdentitySetCodec = <
  T extends ByteArrayOfLength<K>,
  K extends number,
>(
  itemCodec: JamCodec<T> & JSONCodec<T>,
): JamCodec<IdentitySet<T>> & JSONCodec<IdentitySet<T>> => {
  return {
    ...mapCodec(
      createArrayLengthDiscriminator(itemCodec),
      (v) => new IdentitySet<T>(<T[]>v),
      (v) => Array.from(v.values()).sort(compareUint8Arrays),
    ),
    ...ZipJSONCodecs(ArrayOfJSONCodec(itemCodec), {
      fromJSON(json) {
        return new IdentitySet<T>(<T[]>json);
      },
      toJSON(value) {
        return Array.from(value.values()).sort(compareUint8Arrays);
      },
    }),
  };
};
export const identitySetCodec = <
  T extends ByteArrayOfLength<K>,
  K extends number,
>(
  itemCodec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: unknown, propertyKey: string) {
    codec(IdentitySetCodec(itemCodec), jsonKey)(target, propertyKey);
  };
};
