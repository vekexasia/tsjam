import { JamCodec } from "@/codec.js";
import assert from "assert";

/**
 * Encodes a set as defined in 307 or C.1.7
 */
export const createSetCodec = <T, N extends number>(
  itemCodec: JamCodec<T>,
  sorter: (a: T, b: T) => number,
  n: N,
): JamCodec<Set<T>> => {
  return {
    encode(value, bytes) {
      const sortedValues = [...value.values()].sort(sorter);
      assert(
        sortedValues.length === n,
        `Invalid set length ${sortedValues.length} - ${n}`,
      );
      let offset = 0;
      for (const v of sortedValues) {
        offset += itemCodec.encode(v, bytes.subarray(offset));
      }
      return offset;
    },
    decode(bytes) {
      let offset = 0;
      const value = new Set<T>();
      for (let i = 0; i < n; i++) {
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
