import { binaryCodec, jsonCodec, SINGLE_ELEMENT_CLASS } from "@/decorators";
import { JamCodec } from "@/codec.js";
import { ArrayOfJSONCodec } from "@/json/codecs";
import { JSONCodec } from "@/json/json-codec";
import { LengthDiscriminator } from "@/length-discriminated/length-discriminator.js";

/**
 * ArrayLengthDiscriminator provides a way to encode variable length array of single encodable elements
 * $(0.7.0 - C.7)
 *
 */
export const createArrayLengthDiscriminator = <T extends Array<X>, X = T[0]>(
  singleItemCodec: JamCodec<X>,
): JamCodec<T> => {
  const codec = new LengthDiscriminator<T>({
    encode: (value, bytes) => {
      return value.reduce(
        (acc, item) => acc + singleItemCodec.encode(item, bytes.subarray(acc)),
        0,
      );
    },
    decode: (bytes, length: number) => {
      const values: T = [] as unknown as T;
      let offset = 0;
      for (let i = 0; i < length; i++) {
        const decoded = singleItemCodec.decode(bytes.subarray(offset));
        values.push(decoded.value);
        offset += decoded.readBytes;
      }
      return { value: values, readBytes: offset };
    },
    length(value: T): number {
      return value.length;
    },
    encodedSize: (value) => {
      return value.reduce(
        (acc, item) => acc + singleItemCodec.encodedSize(item),
        0,
      );
    },
  });
  return codec;
  // return {
  //   encode: codec.encode.bind(codec),
  //   decode: codec.decode.bind(codec),
  //   encodedSize: codec.encodedSize.bind(codec),
  // };
};

// class property decorator
export const lengthDiscriminatedCodec = <T>(
  codec: JamCodec<T> & JSONCodec<T>,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return (target: unknown, propertyKey: string) => {
    binaryCodec(createArrayLengthDiscriminator(codec))(target, propertyKey);
    jsonCodec(ArrayOfJSONCodec(codec), jsonKey)(target, propertyKey);
  };
};

/**
 * $(0.7.1 - C.11) + length discrimination. not being actively used
 */
export const createSetCodec = <T>(
  codec: JamCodec<T> & JSONCodec<T>,
  sorter: (a: T, b: T) => number,
): JamCodec<Set<T>> & JSONCodec<Set<T>> => {
  const innerCodec = createArrayLengthDiscriminator(codec);
  return {
    encode(value, bytes) {
      const array = Array.from(value).sort(sorter);
      return innerCodec.encode(array, bytes);
    },
    decode(bytes) {
      const decoded = innerCodec.decode(bytes);
      return {
        value: new Set(decoded.value),
        readBytes: decoded.readBytes,
      };
    },
    encodedSize(value) {
      return innerCodec.encodedSize([...value]);
    },
    toJSON(value) {
      return Array.from(value)
        .sort(sorter)
        .map((v) => codec.toJSON(v));
    },
    fromJSON(json) {
      return new Set(json.map((v: unknown) => codec.fromJSON(v)));
    },
  };
};
