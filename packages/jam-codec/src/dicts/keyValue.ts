import { JamCodec } from "@/codec.js";
import {
  LengthDiscSubCodec,
  LengthDiscriminator,
} from "@/lengthdiscriminated/lengthDiscriminator.js";

/**
 * builds a generic dictionaty codec by providing all items
 */
export function buildGenericKeyValueCodec<K, V, X extends Map<K, V>>(
  keyCodec: JamCodec<K>,
  valueCodec: JamCodec<V>,
  keySorter: (a: K, b: K) => number,
): JamCodec<X> {
  const c = new LengthDiscriminator(
    new KeyValue(keyCodec, valueCodec, keySorter),
  ) as unknown as JamCodec<X>;

  return {
    encode: c.encode.bind(c),
    decode: c.decode.bind(c),
    encodedSize: c.encodedSize.bind(c),
  };
}

/**
 * Base keyvalue codec.
 * It encodes a dictionary with orderable keys into key value pairs.
 * it's out of spec as it is. The spec defines a Variable length discriminator is needed
 * when using a fn as valueCodec, the key for each given element is provided.
 * @see buildKeyValueCodec
 * $(0.7.1 - C.10)
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
      const valueCodec = this.valueCodec;
      const value = valueCodec.decode(bytes.subarray(offset));
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
      const valueCodec = this.valueCodec;
      return (
        acc +
        this.keyCodec.encodedSize(key) +
        valueCodec.encodedSize(value.get(key)!)
      );
    }, 0);
  }
}
