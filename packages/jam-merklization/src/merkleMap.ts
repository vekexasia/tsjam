import { StateKey } from "@tsjam/types";
import { StateKeyBigInt, stateKeyCodec } from "./stateCodecs";
import { encodeWithCodec } from "@tsjam/codec";

export class MerkleMap implements Map<StateKey | StateKeyBigInt, Uint8Array> {
  #storage: Map<StateKeyBigInt, Uint8Array> = new Map();
  clear(): void {
    this.#storage.clear();
  }
  #computeKey(key: StateKeyBigInt | StateKey): StateKeyBigInt {
    if (key instanceof Uint8Array) {
      key = stateKeyCodec.decode(key).value;
    }
    return key;
  }
  delete(key: StateKeyBigInt | StateKey): boolean {
    if (key instanceof Uint8Array) {
      key = stateKeyCodec.decode(key).value;
    }
    return this.#storage.delete(this.#computeKey(key));
  }
  forEach(
    callbackfn: (
      value: Uint8Array<ArrayBufferLike>,
      key: any,
      map: Map<any, Uint8Array<ArrayBufferLike>>,
    ) => void,
    thisArg?: any,
  ): void {
    throw new Error("Method not implemented.");
  }
  get(key: StateKeyBigInt | StateKey): Uint8Array | undefined {
    return this.#storage.get(this.#computeKey(key));
  }
  has(key: StateKeyBigInt | StateKey): boolean {
    return this.#storage.has(this.#computeKey(key));
  }
  set(key: StateKeyBigInt | StateKey, value: Uint8Array): this {
    this.#storage.set(this.#computeKey(key), value);
    return this;
  }
  get size(): number {
    return this.#storage.size;
  }
  entries(): MapIterator<[any, Uint8Array<ArrayBufferLike>]> {
    throw new Error("Method not implemented.");
  }
  keys(): MapIterator<StateKey> {
    return [...this.#storage.keys()].map((skb) =>
      encodeWithCodec(stateKeyCodec, skb),
    ) as unknown as MapIterator<StateKey>;
  }
  values(): MapIterator<Uint8Array<ArrayBufferLike>> {
    throw new Error("Method not implemented.");
  }
  [Symbol.iterator](): MapIterator<
    [StateKeyBigInt, Uint8Array<ArrayBufferLike>]
  > {
    throw new Error("Method not implemented.");
  }
  [Symbol.toStringTag] = "MerkleMap";
}
