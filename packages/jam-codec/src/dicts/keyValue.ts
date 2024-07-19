import { JamCodec } from "@/codec.js";
import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";

export interface KeyOrderableDictionary<T, V> {
  get orderedKeys(): T[];
  valueOf(key: T): V;
}

/**
 * Base keyvalue codec.
 * It encodes a dictionary with orderable keys into key value pairs.
 * it's out of spec as it is. The spec defines a Variable length discriminator is needed
 * @see buildKeyValueCodec
 * @private
 */
class KeyValue<T, V, X extends KeyOrderableDictionary<T, V>>
  implements JamCodec<X>
{
  constructor(
    private keyCodec: JamCodec<T>,
    private valueCodec: JamCodec<V>,
    private xBuilder: (orderedKeys: T[], orderedValues: V[]) => X,
  ) {}

  encode(value: X, bytes: Uint8Array): number {
    let offset = 0;
    for (const key of value.orderedKeys) {
      offset += this.keyCodec.encode(key, bytes.subarray(offset));
      offset += this.valueCodec.encode(
        value.valueOf(key),
        bytes.subarray(offset),
      );
    }
    return offset;
  }

  decode(bytes: Uint8Array): { value: X; readBytes: number } {
    const orderedKeys: T[] = [];
    const orderedValues: V[] = [];
    let offset = 0;
    while (offset < bytes.length) {
      const key = this.keyCodec.decode(bytes.subarray(offset));
      offset += key.readBytes;
      const value = this.valueCodec.decode(bytes.subarray(offset));
      offset += value.readBytes;
      orderedKeys.push(key.value);
      orderedValues.push(value.value);
    }
    return {
      value: this.xBuilder(orderedKeys, orderedValues),
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
 * @param xBuilder the constructor to use when decoding
 */
export function buildKeyValueCodec<
  T,
  V,
  X extends KeyOrderableDictionary<T, V>,
>(
  keyCodec: JamCodec<T>,
  valueCodec: JamCodec<V>,
  xBuilder: (orderedKeys: T[], orderedValues: V[]) => X,
): JamCodec<X> {
  return new LengthDiscriminator(new KeyValue(keyCodec, valueCodec, xBuilder));
}
if (import.meta.vitest) {
  const { E } = await import("@/ints/e.js");
  const { describe, expect, it } = import.meta.vitest;
  describe("keyValue", () => {
    class B implements KeyOrderableDictionary<bigint, bigint> {
      constructor(
        public orderedKeys: bigint[],
        public orderedValues: bigint[],
      ) {}

      valueOf(key: bigint): bigint {
        return this.orderedValues[this.orderedKeys.indexOf(key)];
      }
    }

    it("should encode and decode a value", () => {
      const codec = buildKeyValueCodec(
        E,
        E,
        (keys, values) => new B(keys, values),
      );
      const bytes = new Uint8Array(10);
      codec.encode(new B([1n, 2n], [3n, 4n]), bytes);
      expect(codec.decode(bytes).value).toEqual(new B([1n, 2n], [3n, 4n]));
    });
    it.skip("should allow for different key and value types", () => {});
    it("should provide proper size for encoded value", () => {
      const codec = buildKeyValueCodec(
        E,
        E,
        (keys, values) => new B(keys, values),
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
