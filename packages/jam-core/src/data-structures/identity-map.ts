import {
  buildGenericKeyValueCodec,
  JamCodec,
  JSONCodec,
  mapCodec,
  MapJSONCodec,
  ZipJSONCodecs,
} from "@tsjam/codec";
import { ByteArrayOfLength } from "@tsjam/types";
import { uncheckedConverter } from "@vekexasia/bigint-uint8array";
import { SafeKey } from "./safe-key";

export class IdentityMap<K extends ByteArrayOfLength<N>, N extends number, V>
  implements Map<K, V>
{
  private internalMap: Map<SafeKey, V> = new Map();
  private keyLookupMap: Map<SafeKey, K> = new Map();

  readonly [Symbol.toStringTag]: string = "SafeMap";

  constructor(entries?: ReadonlyArray<readonly [K, V]> | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  private getInternalKey(key: K): SafeKey {
    return uncheckedConverter.arrayToLittleEndian(key);
  }

  lookupKey(key: SafeKey): K {
    if (this.keyLookupMap.has(key)) {
      return this.keyLookupMap.get(key)!;
    }
    throw new Error("lookupKey called with unknown key");
  }

  set(key: K, value: V): this {
    const internalKey = this.getInternalKey(key);
    this.internalMap.set(internalKey, value);
    this.keyLookupMap.set(internalKey, key);
    return this;
  }

  get(key: K): V | undefined {
    const internalKey = this.getInternalKey(key);
    return this.internalMap.get(internalKey);
  }

  has(key: K): boolean {
    const internalKey = this.getInternalKey(key);
    return this.internalMap.has(internalKey);
  }

  delete(key: K): boolean {
    const internalKey = this.getInternalKey(key);

    const toRet = this.internalMap.delete(internalKey);
    return this.keyLookupMap.delete(internalKey) && toRet;
  }

  clear(): void {
    this.internalMap.clear();
    this.keyLookupMap.clear();
  }

  get size(): number {
    return this.internalMap.size;
  }

  keys(): IterableIterator<K> {
    return [...this.internalMap.keys()].map((k) => this.lookupKey(k)).values();
  }

  values(): IterableIterator<V> {
    return this.internalMap.values();
  }

  entries(): IterableIterator<[K, V]> {
    return [...this.internalMap.entries()]
      .map<[K, V]>(([k, v]) => [this.lookupKey(k), v])
      .values();
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.internalMap.forEach((value, key) => {
      callbackfn.call(thisArg, value, this.lookupKey(key), this);
    });
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  clone(): IdentityMap<K, N, V> {
    const clone = new IdentityMap<K, N, V>();
    for (const [key, value] of this.entries()) {
      clone.set(key, value);
    }
    return clone;
  }

  toSet(): Set<V> {
    return new Set(this.internalMap.values());
  }
}

export const IdentityMapCodec = <
  K extends ByteArrayOfLength<N>,
  N extends number,
  V,
>(
  keyCodec: JamCodec<K> & JSONCodec<K>,
  valueCodec: JamCodec<V> & JSONCodec<V>,
  jsonKeys: { key: string; value: string },
): JamCodec<IdentityMap<K, N, V>> & JSONCodec<IdentityMap<K, N, V>> => {
  return {
    ...mapCodec(
      buildGenericKeyValueCodec(keyCodec, valueCodec, (a, b) =>
        Buffer.compare(a, b),
      ),
      (v) => new IdentityMap<K, N, V>([...v.entries()]),
      (v) => v,
    ),
    ...ZipJSONCodecs(
      MapJSONCodec(jsonKeys, keyCodec, valueCodec, (a, b) =>
        Buffer.compare(a, b),
      ),
      {
        fromJSON(json) {
          return new IdentityMap<K, N, V>([...json.entries()]);
        },
        toJSON(value) {
          return value;
        },
      },
    ),
  };
};
