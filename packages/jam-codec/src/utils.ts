import { JamCodec } from "@/codec.js";

/**
 * encode with codec a value by also creating the buffer
 * @param codec - the codec to use
 * @param value - the value to encode
 */
export const encodeWithCodec = <T>(
  codec: JamCodec<T>,
  value: T,
): Uint8Array => {
  const buffer = new Uint8Array(codec.encodedSize(value));
  codec.encode(value, buffer);
  return buffer;
};

/**
 * provides utility to clone a value with a codec
 */
export const cloneWithCodec = <T>(codec: JamCodec<T>, value: T): T => {
  return codec.decode(encodeWithCodec(codec, value)).value;
};

type Entries<T> = {
  [K in keyof T]: [K, JamCodec<T[K]>];
}[keyof T];

export const createCodec = <T extends object>(
  itemsCodec: Entries<T>[],
): JamCodec<T> => {
  return {
    encode(value, bytes) {
      let offset = 0;
      for (const [key, codec] of itemsCodec) {
        try {
          offset += codec.encode(value[key], bytes.subarray(offset));
          if (isNaN(offset)) {
            console.error("diocan", key);
          }
        } catch (e) {
          console.error(
            `Error encoding key: ${key as string}`,
            e as unknown as any,
          );
          throw e;
        }
      }
      return offset;
    },
    decode(bytes) {
      let offset = 0;
      const toRet = {} as T;
      for (const [key, codec] of itemsCodec) {
        const { value, readBytes } = codec.decode(bytes.subarray(offset));
        toRet[key] = value;
        offset += readBytes;
      }
      return { value: toRet, readBytes: offset };
    },
    encodedSize(value) {
      let size = 0;
      for (const [key, codec] of itemsCodec) {
        size += codec.encodedSize(value[key]);
      }
      return size;
    },
  };
};

/**
 * transform a T codec into a U codec
 */
export const mapCodec = <T, U>(
  codec: JamCodec<T>,
  map: (v: T) => U,
  inverse: (v: U) => T,
): JamCodec<U> => {
  return {
    encode(value, bytes) {
      return codec.encode(inverse(value), bytes);
    },
    decode(bytes) {
      const { value, readBytes } = codec.decode(bytes);
      return { value: map(value), readBytes };
    },
    encodedSize(value) {
      return codec.encodedSize(inverse(value));
    },
  };
};

export const extendCodec = <T, U>(
  codec: JamCodec<T>,
  extension: JamCodec<U>,
): JamCodec<T & U> => {
  return {
    encode(value, bytes) {
      let offset = codec.encode(value, bytes);
      offset += extension.encode(value, bytes.subarray(offset));
      return offset;
    },
    decode(bytes) {
      const { value: base, readBytes } = codec.decode(bytes);
      const { value: ext, readBytes: extReadBytes } = extension.decode(
        bytes.subarray(readBytes),
      );
      return {
        value: { ...base, ...ext },
        readBytes: readBytes + extReadBytes,
      };
    },
    encodedSize(value) {
      return codec.encodedSize(value) + extension.encodedSize(value);
    },
  };
};
