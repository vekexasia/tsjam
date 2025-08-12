import { JamCodec } from "./codec.js";

type Entries<T> = {
  [K in keyof T]: [K, JamCodec<NonNullable<T[K]>>];
}[keyof T];

/**
 * This codec factory creates a codec that is able to
 * encode/decode an object that has only one if their property set
 * ex {a: 1} or {b: 2} but not {a: 1, b: 2}
 * so in the case above `T = {a?: number, b?: number}`
 * there is no formalism for this in graypaper but it does come handy in some situations
 */
export const eitherOneOfCodec = <T extends object>(
  itemsCodec: Entries<T>[],
): JamCodec<T> => {
  return {
    encode(value, bytes) {
      for (let i = 0; i < itemsCodec.length; i++) {
        const [key, codec] = itemsCodec[i];
        if (typeof value[key] !== "undefined") {
          bytes[0] = i;
          return 1 + codec.encode(value[key]!, bytes.subarray(1));
        }
      }
      throw new Error("No codec for value");
    },
    decode(bytes) {
      const byte = bytes[0];
      const [key, codec] = itemsCodec[byte];
      const { value, readBytes } = codec.decode(bytes.subarray(1));
      return { value: <T>{ [key]: value }, readBytes: 1 + readBytes };
    },
    encodedSize(value) {
      for (let i = 0; i < itemsCodec.length; i++) {
        const [key, codec] = itemsCodec[i];
        if (typeof value[key] !== "undefined") {
          return 1 + codec.encodedSize(value[key]!);
        }
      }
      throw new Error("No codec for value");
    },
  };
};
