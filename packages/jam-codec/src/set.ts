import { JamCodec } from "@/codec.js";

/**
 * Encodes a set - notice that the codec itself can not decode
 * $(0.6.4 - C.12)
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
    decode(_bytes) {
      throw new Error("Set Codec cannot be directly decoded");
    },
    encodedSize(value) {
      return [...value]
        .map((a) => itemCodec.encodedSize(a))
        .reduce((a, b) => a + b, 0);
    },
  };
};
