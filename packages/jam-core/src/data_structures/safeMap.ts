import { SafeKey, SafeKeyProvider, isSafeKey, isSafeKeyable } from "./safeKey";

export class SafeMap<K, V> implements Map<K, V> {
  private internalMap: Map<SafeKey, V> = new Map();
  private keyLookupMap: Map<SafeKey, K> = new Map();
  private safeKeyProvider?: SafeKeyProvider<K>;

  readonly [Symbol.toStringTag]: string = "SafeMap";

  constructor(entries?: ReadonlyArray<readonly [K, V]> | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  public setSafeKeyProvider(prov: SafeKeyProvider<K>) {
    this.safeKeyProvider = prov;
  }

  private getInternalKey(key: K): SafeKey {
    if (isSafeKey(key)) {
      return key;
    }

    if (this.safeKeyProvider) {
      return this.safeKeyProvider(key);
    }

    // key might be SafeKeyable
    if (isSafeKeyable(key)) {
      return key.safeKey();
    }

    throw new Error(
      "cannot convert key to SafeKey did you set a provider or is key SafeKeyable?",
    );
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
    thisArg?: unknown,
  ): void {
    this.internalMap.forEach((value, key) => {
      callbackfn.call(thisArg, value, this.lookupKey(key), this);
    });
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}
