import { JamCodec } from "@/codec.js";
import {
  LengthDiscSubCodec,
  LengthDiscriminator,
} from "@/lengthdiscriminated/lengthDiscriminator.js";
import { Hash } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { encodeWithCodec } from "@/utils.js";

/**
 * Base keyvalue codec.
 * It encodes a dictionary with orderable keys into key value pairs.
 * it's out of spec as it is. The spec defines a Variable length discriminator is needed
 * @see buildKeyValueCodec
 */
class KeyValue<K, V> implements LengthDiscSubCodec<Map<K, V>> {
  constructor(
    private keyCodec: JamCodec<K>,
    private valueCodec: JamCodec<V>,
    private keySorter: (a: K, b: K) => number,
  ) {}

  encode(value: Map<K, V>, bytes: Uint8Array): number {
    let offset = 0;
    const orderedKeys = [...value.keys()].sort(this.keySorter);
    for (const key of orderedKeys) {
      offset += this.keyCodec.encode(key, bytes.subarray(offset));
      offset += this.valueCodec.encode(value.get(key)!, bytes.subarray(offset));
    }
    return offset;
  }

  length(value: Map<K, V>): number {
    return value.size;
  }

  decode(
    bytes: Uint8Array,
    length: number,
  ): { value: Map<K, V>; readBytes: number } {
    const orderedKeys: K[] = [];
    const orderedValues: V[] = [];
    let offset = 0;
    while (orderedKeys.length < length) {
      const key = this.keyCodec.decode(bytes.subarray(offset));
      offset += key.readBytes;
      const value = this.valueCodec.decode(bytes.subarray(offset));
      offset += value.readBytes;
      orderedKeys.push(key.value);
      orderedValues.push(value.value);
    }

    return {
      value: new Map(
        orderedKeys.map((key, index) => [key, orderedValues[index]]),
      ),
      readBytes: offset,
    };
  }

  encodedSize(value: Map<K, V>): number {
    return [...value.keys()].reduce((acc, key) => {
      return (
        acc +
        this.keyCodec.encodedSize(key) +
        this.valueCodec.encodedSize(value.get(key)!)
      );
    }, 0);
  }
}

/**
 * builds a dictionary codec when using map with Hash as key
 */
export function buildKeyValueCodec<K extends Hash, V>(
  valueCodec: JamCodec<V>,
  keySorter: (a: Hash, b: Hash) => number = (a, b) =>
    a - b < 0n ? -1 : a - b > 0n ? 1 : 0,
): JamCodec<Map<K, V>> {
  return new LengthDiscriminator(
    new KeyValue(HashCodec as unknown as JamCodec<K>, valueCodec, keySorter),
  );
}

/**
 * builds a generic dictionaty codec by providing all items
 */
export function buildGenericKeyValueCodec<K, V, X extends Map<K, V>>(
  keyCodec: JamCodec<K>,
  valueCodec: JamCodec<V>,
  keySorter: (a: K, b: K) => number,
): JamCodec<X> {
  return new LengthDiscriminator(
    new KeyValue(keyCodec, valueCodec, keySorter),
  ) as unknown as JamCodec<X>;
}

if (import.meta.vitest) {
  const { E } = await import("@/ints/e.js");
  const { describe, expect, it } = import.meta.vitest;
  describe("keyValue", () => {
    it("should encode and decode a value", () => {
      const b = new Map([
        [1n, 2n],
        [3n, 4n],
      ]) as unknown as Map<Hash, bigint>;
      const codec = buildKeyValueCodec(E);
      const bytes = encodeWithCodec(codec, b);
      expect(codec.decode(bytes).value).toEqual(b);
    });
  });
}
