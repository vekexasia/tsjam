import { JamCodec } from "@/codec.js";

/**
 * Encodes a set - notice that the codec itself can not decode
 * $(0.6.1 - C.12)
 */
export const createSetCodec = <T>(
  itemCodec: JamCodec<T>,
  sorter: (a: T, b: T) => number,
): JamCodec<Set<T>> => {
  return {
    encode(value, bytes) {
      const sortedValues = [...value.values()].sort(sorter);
      let offset = 0;
      for (const v of sortedValues) {
        offset += itemCodec.encode(v, bytes.subarray(offset));
      }
      return offset;
    },
    decode(bytes) {
      // NOTE: there is no indication this can work.
      // It will successfully decode only if itemCodec is capable of decoding
      // a bytearrray longer than the actual encoded value.
      let offset = 0;
      const value = new Set<T>();
      while (offset < bytes.length) {
        const decoded = itemCodec.decode(bytes.subarray(offset));
        value.add(decoded.value);
        offset += decoded.readBytes;
      }
      return {
        value,
        readBytes: offset,
      };
    },
    encodedSize(value) {
      return [...value]
        .map((a) => itemCodec.encodedSize(a))
        .reduce((a, b) => a + b, 0);
    },
  };
};
