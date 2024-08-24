import { JamCodec } from "@/codec";
import { LittleEndian } from "@/ints/littleEndian";
import assert from "node:assert";

/**
 * @see (273) appendix C of the spec
 * @param sub - the number of bytes to encode
 */
export const E_sub = (sub: number): JamCodec<bigint> => ({
  encode: (value: bigint, bytes: Uint8Array): number => {
    assert(
      bytes.length === sub,
      `bytes length=${bytes.length} must match sub=${sub}`,
    );
    return LittleEndian.encode(value, bytes.subarray(0, sub));
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    if (bytes.length < sub) {
      const padded = new Uint8Array(sub).fill(0);
      padded.set(bytes);
      console.log("padded", padded, LittleEndian.decode(padded));
      return LittleEndian.decode(padded);
    }
    return LittleEndian.decode(bytes.subarray(0, sub));
  },
  encodedSize: (): number => {
    return sub;
  },
});

export const E_4 = E_sub(4);
export const E_8 = E_sub(8);
export const E_2 = E_sub(2);
export const E_1 = E_sub(1);
