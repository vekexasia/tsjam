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
