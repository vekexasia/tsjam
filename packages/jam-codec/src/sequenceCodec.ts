import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import { SeqOfLength } from "@vekexasia/jam-types";

export const createSequenceCodec = <T, K extends number>(
  howMany: number,
  codec: JamCodec<T>,
): JamCodec<SeqOfLength<T, K>> => {
  return {
    encode(value: T[], bytes: Uint8Array): number {
      assert(value.length === howMany, "Invalid array length");
      let offset = 0;
      for (let i = 0; i < howMany; i++) {
        offset += codec.encode(value[i], bytes);
      }
      return offset;
    },
    decode(bytes: Uint8Array) {
      const values: T[] = [];
      let offset = 0;
      for (let i = 0; i < howMany; i++) {
        const decoded = codec.decode(bytes.subarray(offset));
        values.push(decoded.value);
        offset += decoded.readBytes;
      }
      return { value: values as SeqOfLength<T, K>, readBytes: offset };
    },
    encodedSize: (value) => {
      return value.reduce((acc, item) => acc + codec.encodedSize(item), 0);
    },
  };
};
