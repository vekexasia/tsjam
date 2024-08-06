import { JamCodec } from "@/codec";
import { LittleEndian } from "@/ints/littleEndian";

/**
 * @see (273) appendix C of the spec
 * @param sub - the number of bytes to encode
 */
export const E_sub = (sub: number): JamCodec<bigint> => ({
  encode: (value: bigint, bytes: Uint8Array): number => {
    return LittleEndian.encode(value, bytes.subarray(0, sub));
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    return LittleEndian.decode(bytes.subarray(0, sub));
  },
  encodedSize: (): number => {
    return sub;
  },
});

export const E_4 = E_sub(4);
export const E_8 = E_sub(8);
export const E_2 = E_sub(2);
