import {
  binaryCodec,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "@/class/mainDecorators";
import { JamCodec } from "@/codec.js";
import { ArrayOfJSONCodec } from "@/json/codecs";
import { JSONCodec } from "@/json/JsonCodec";
import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";

/**
 * ArrayLengthDiscriminator provides a way to encode variable length array of single encodable elements
 * $(0.7.0 - C.7)
 *
 */
export const createArrayLengthDiscriminator = <T extends Array<X>, X = T[0]>(
  singleItemCodec: JamCodec<X>,
): JamCodec<T> => {
  return new LengthDiscriminator<T>({
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
