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
    decode: (bytes) => {
      const values: T[] = [];
      let offset = 0;
      while (offset < bytes.length) {
        const decoded = singleItemCodec.decode(bytes.subarray(offset));
        values.push(decoded.value);
        offset += decoded.readBytes;
      }
      return { value: values, readBytes: offset };
    },
    encodedSize: (value) => {
      return value.reduce(
        (acc, item) => acc + singleItemCodec.encodedSize(item),
        0,
      );
    },
  });
};
