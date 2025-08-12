import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import { SeqOfLength } from "@tsjam/types";
import {
  binaryCodec,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "@/decorators";
import { ArrayOfJSONCodec } from "./json/codecs";
import { JSONCodec } from "./json/json-codec";
type ExtractLength<T> = T extends SeqOfLength<unknown, infer B> ? B : never;

export const createSequenceCodec = <
  X extends SeqOfLength<T, K>,
  K extends number = ExtractLength<X>,
  T = X[0],
>(
  howMany: K,
  codec: JamCodec<T>,
): JamCodec<X> => {
  return {
    encode(value: T[], bytes: Uint8Array): number {
      assert(
        value.length === howMany,
        `Invalid array length ${value.length} - ${howMany}`,
      );
      let offset = 0;
      for (let i = 0; i < howMany; i++) {
        offset += codec.encode(value[i], bytes.subarray(offset));
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
      return { value: values as X, readBytes: offset };
    },
    encodedSize: (value) => {
      return value.reduce((acc, item) => acc + codec.encodedSize(item), 0);
    },
  };
};

export const sequenceCodec = <T>(
  length: number,
  codec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return function (target: unknown, propertyKey: string) {
    binaryCodec(createSequenceCodec(length, codec))(target, propertyKey);
    jsonCodec(ArrayOfJSONCodec(codec), jsonKey)(target, propertyKey);
  };
};
