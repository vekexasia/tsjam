import { JamCodec } from "@/codec.js";
import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";

/**
 * ArrayLengthDiscriminator provides a way to encode variable length array of single encodable elements
 */
export const createArrayLengthDiscriminator = <T>(
  singleItemCodec: JamCodec<T>,
) => {
  return new LengthDiscriminator<T[]>({
    encode: (value, bytes) => {
      return value.reduce(
        (acc, item) => singleItemCodec.encode(item, bytes.subarray(acc)),
        0,
      );
    },
    decode: (bytes, length: number) => {
      const values: T[] = [];
      let offset = 0;
      for (let i = 0; i < length; i++) {
        const decoded = singleItemCodec.decode(bytes.subarray(offset));
        values.push(decoded.value);
        offset += decoded.readBytes;
      }
      return { value: values, readBytes: offset };
    },
    length(value: T[]): number {
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
