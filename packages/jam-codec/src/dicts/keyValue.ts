import { JamCodec } from "@/codec.js";
import { LengthDiscriminator } from "@/lengthDiscriminator.js";

export interface KeyOrderableDictionary<
  T extends readonly unknown[],
  V extends readonly unknown[],
> {
  valueOf(key: T[number]): V[number];
}
type WrappedCodec<T> = {
  [k in keyof T]: { key: JamCodec<T[k]>; value: JamCodec<T[k]> };
};
/**
 * Base keyvalue codec.
 * It encodes a dictionary with orderable keys into key value pairs.
 * it's out of spec as it is. The spec defines a Variable length discriminator is needed
 * @see buildKeyValueCodec
 * @private
 */
class KeyValue<
  T extends readonly unknown[],
  V extends { [K in keyof T]: unknown },
  X extends KeyOrderableDictionary<T, V>,
> implements JamCodec<X>
{
  constructor(
    private codecs: WrappedCodec<readonly [...T]>,
    private orderedKeys: readonly [...T],
    private xBuilder: (orderedValues: V) => X,
  ) {}

  encode(value: X, bytes: Uint8Array): number {
    let offset = 0;
    for (const key of this.orderedKeys) {
      offset += this.codecs[key].key.encode(key, bytes.subarray(offset));
      offset += this.codecs[key].value.encode(
        value.valueOf(key),
        bytes.subarray(offset),
      );
    }
    return offset;
  }

  decode(bytes: Uint8Array): { value: X; readBytes: number } {
    const orderedValues: V[number][] = [];
    let offset = 0;
    for (const key of this.orderedKeys) {
      const decodedKey = this.codecs[key].decode(bytes.subarray(offset));
      offset += decodedKey.readBytes;
      const value = this.codecs[key].decode(bytes.subarray(offset));
      offset += value.readBytes;
      orderedValues.push(value.value);
    }
    while (offset < bytes.length) {
      const key = this.keyCodec.decode(bytes.subarray(offset));
      offset += key.readBytes;
      const value = this.valueCodec.decode(bytes.subarray(offset));
      offset += value.readBytes;
      orderedKeys.push(key.value);
      orderedValues.push(value.value);
    }
    return {
      value: this.xBuilder(orderedValues as unknown as V),
      readBytes: offset,
    };
  }

  encodedSize(value: X): number {
    return value.orderedKeys.reduce((acc, key) => {
      return (
        acc +
        this.keyCodec.encodedSize(key) +
        this.valueCodec.encodedSize(value.valueOf(key))
      );
    }, 0);
  }
}

/**
 * Builds a codec for a dictionary with orderable keys
 * graypaper reference is 279
 * @param keyCodec the codec to use to encode the keys
 * @param valueCodec the codec to use to encode the values
 * @param orderedKeys the keys in the order they should be encoded
 * @param xBuilder the constructor to use when decoding
 */
export function buildKeyValueCodec<
  T extends readonly unknown[],
  V extends { [K in keyof T]: unknown },
  X extends KeyOrderableDictionary<T, V>,
>(
  codecs: {
    [K in keyof T]: { key: JamCodec<T[K]>; value: JamCodec<V[K]> };
  },
  orderedKeys: readonly [...T],
  xBuilder: (orderedValues: V) => X,
): JamCodec<X> {
  return new LengthDiscriminator(new KeyValue(codecs, orderedKeys, xBuilder));
}
if (import.meta.vitest) {
  const { E } = await import("@/ints/e.js");
  const { BitSequenceCodec } = await import("@/bitSequence.js");
  type bit = 0 | 1;
  const { describe, expect, it } = import.meta.vitest;
  describe("keyValue", () => {
    type Keys = readonly [bigint, bigint];
    type Values = readonly [bigint, bigint];
    class B implements KeyOrderableDictionary<Keys, Values> {
      constructor(
        public readonly orderedKeys: readonly [bigint, bigint],
        public readonly orderedValues: readonly [bigint, bigint],
      ) {}

      valueOf(key: bigint): bigint {
        return this.orderedValues[this.orderedKeys.indexOf(key)];
      }
    }

    it("should encode and decode a value", () => {
      const codec = buildKeyValueCodec<Keys, Values, B>(
        E,
        E,
        [1n, 2n],
        (values) => new B([1n, 2n], values),
      );
      const bytes = new Uint8Array(10);
      codec.encode(new B([1n, 2n], [3n, 4n]), bytes);
      expect(codec.decode(bytes).value).toEqual(new B([1n, 2n], [3n, 4n]));
    });
    it("should allow for different key and value types", () => {
      type Keys = readonly [bigint, bigint];
      type Values = readonly [bigint, bit[]];
      class Multi implements KeyOrderableDictionary<Keys, Values> {
        constructor(
          public readonly orderedKeys: readonly [bigint, bigint],
          public readonly orderedValues: readonly [bigint, bit[]],
        ) {}

        valueOf(key: bigint): bigint | bit[] {
          return this.orderedValues[this.orderedKeys.indexOf(key)];
        }
      }
      const codec = buildKeyValueCodec<Keys, Values, Multi>(
        E,
        E,
        [1n, 2n],
        (values) => new B([1n, 2n], values),
      );
    });
    it("should provide proper size for encoded value", () => {
      const codec = buildKeyValueCodec<Keys, Values, B>(
        E,
        E,
        [1n, 2n],
        (values) => new B([1n, 2n], values),
      );
      expect(codec.encodedSize(new B([1n, 2n], [3n, 4n]))).toBe(
        1 + // length discriminator
          E.encodedSize(1n) +
          E.encodedSize(3n) +
          E.encodedSize(2n) +
          E.encodedSize(4n),
      );
    });
  });
}
