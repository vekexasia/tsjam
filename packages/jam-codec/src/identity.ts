import { JamCodec } from "@/codec.js";
import { ByteArrayOfLength } from "@tsjam/types";
import { BufferJSONCodec } from "./json/codecs";
import { JSONCodec } from "./json/json-codec";

// $(0.6.4 - C.2)
export const IdentityCodec: JamCodec<Uint8Array> = {
  decode(bytes: Uint8Array): { value: Uint8Array; readBytes: number } {
    return { value: bytes, readBytes: bytes.length };
  },
  encode(value: Uint8Array, bytes: Uint8Array): number {
    bytes.set(value);
    return value.length;
  },
  encodedSize(value: Uint8Array): number {
    return value.length;
  },
};

export const fixedSizeIdentityCodec = <
  X extends ByteArrayOfLength<T>,
  T extends number,
>(
  size: T,
): JamCodec<X> => {
  return {
    decode(bytes: Uint8Array) {
      return { value: bytes.subarray(0, size) as X, readBytes: size };
    },
    encode(value: Uint8Array, bytes: Uint8Array): number {
      bytes.set(value);
      return value.length;
    },
    encodedSize(): number {
      return size;
    },
  };
};

export const xBytesCodec = <T extends ByteArrayOfLength<K>, K extends number>(
  k: K,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <JamCodec<T> & JSONCodec<T>>(<any>{
    ...fixedSizeIdentityCodec(k),
    ...BufferJSONCodec(),
  });
};
