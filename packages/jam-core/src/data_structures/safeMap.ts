export type SafeKey = string | number | boolean | bigint | symbol;

export interface SafeMapKeyable {
  mapKey(): SafeKey;
}

const isSafeKey = <K extends SafeKey | SafeMapKeyable>(
  key: K,
  // @ts-ignore
): key is SafeKey => {
  return (
    typeof key === "string" ||
    typeof key === "number" ||
    typeof key === "boolean" ||
    typeof key === "bigint" ||
    typeof key === "symbol"
  );
};

export class SafeMap<K extends SafeKey | SafeMapKeyable, V>
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
    if (isSafeKey(key)) {
      return key;
    }
    return key.mapKey();
  }

  lookupKey(key: SafeKey): K {
    if (this.keyLookupMap.has(key)) {
      return this.keyLookupMap.get(key)!;
    }
    return key as K;
  }

  set(key: K, value: V): this {
    const internalKey = this.getInternalKey(key);
    this.internalMap.set(internalKey, value);
    if (!isSafeKey(key)) {
      this.keyLookupMap.set(internalKey, key);
    }
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
    if (!isSafeKey(key)) {
      return this.keyLookupMap.delete(internalKey) && toRet;
    }
    return toRet;
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
    thisArg?: any,
  ): void {
    this.internalMap.forEach((value, key) => {
      callbackfn.call(thisArg, value, this.lookupKey(key), this);
    });
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}
