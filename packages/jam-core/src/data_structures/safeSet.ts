import {
  ArrayOfJSONCodec,
  binaryCodec,
  createArrayLengthDiscriminator,
  JamCodec,
  JSONCodec,
  jsonCodec,
  mapCodec,
  SINGLE_ELEMENT_CLASS,
  ZipJSONCodecs,
} from "@tsjam/codec";
import { isSafeKey, isSafeKeyable, SafeKey, SafeKeyProvider } from "./safeKey";
import { T } from "vitest/dist/chunks/environment.LoooBwUu.js";

export class SafeSet<T> implements Set<T> {
  private internalSet: Set<SafeKey> = new Set();
  private keyLookupMap: Map<SafeKey, T> = new Map();
  private safeKeyProvider?: SafeKeyProvider<T>;

  readonly [Symbol.toStringTag]: string = "SafeSet";

  constructor(
    values?: ReadonlyArray<T> | null,
    safeKeyProvider?: SafeKeyProvider<T>,
  ) {
    if (values) {
      for (const value of values) {
        this.add(value);
      }
    }
    if (safeKeyProvider) {
      this.safeKeyProvider = safeKeyProvider;
    }
  }

  public setSafeKeyProvider(prov: SafeKeyProvider<T>) {
    this.safeKeyProvider = prov;
    return this;
  }

  private getInternalKey(value: T): SafeKey {
    if (isSafeKey(value)) {
      return value;
    }
    if (this.safeKeyProvider) {
      return this.safeKeyProvider(value);
    }

    // key might be SafeKeyable
    if (isSafeKeyable(value)) {
      return value.safeKey();
    }

    throw new Error(
      "cannot convert key to SafeKey did you set a provider or is key SafeKeyable?",
    );
  }

  lookupValue(key: SafeKey): T {
    if (this.keyLookupMap.has(key)) {
      return this.keyLookupMap.get(key)!;
    }
    return key as T;
  }

  add(value: T): this {
    const internalKey = this.getInternalKey(value);
    this.internalSet.add(internalKey);
    if (internalKey !== value) {
      this.keyLookupMap.set(internalKey, value);
    }
    return this;
  }

  has(value: T): boolean {
    const internalKey = this.getInternalKey(value);
    return this.internalSet.has(internalKey);
  }

  delete(value: T): boolean {
    const internalKey = this.getInternalKey(value);
    const toRet = this.internalSet.delete(internalKey);
    if (internalKey !== value) {
      return this.keyLookupMap.delete(internalKey) && toRet;
    }
    return toRet;
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
    thisArg?: any,
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

export const safeSetCodec = <T>(
  itemCodec: JamCodec<T> & JSONCodec<T>,
  safeKeyProvider: SafeKeyProvider<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: any, propertyKey: string) {
    binaryCodec(
      mapCodec(
        createArrayLengthDiscriminator(itemCodec),
        (v) => new SafeSet<T>(v, safeKeyProvider),
        (v) => Array.from(v.values()),
      ),
    )(target, propertyKey);
    jsonCodec(
      ZipJSONCodecs(ArrayOfJSONCodec(itemCodec), {
        fromJSON(json) {
          return new SafeSet<T>(json, safeKeyProvider);
        },
        toJSON(value) {
          return Array.from(value.values());
        },
      }),
      jsonKey,
    )(target, propertyKey);
  };
};
