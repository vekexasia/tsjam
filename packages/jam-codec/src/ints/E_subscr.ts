import { JamCodec } from "@/codec";
import { LittleEndian } from "@/ints/littleEndian";
import { u16, u32, u8 } from "@tsjam/types";
import assert from "node:assert";

/**
 * @param sub - the number of bytes to encode
 * $(0.5.3 - C.5)
 */
export const E_sub = <T extends bigint = bigint>(sub: number): JamCodec<T> => ({
  encode: (value: T, bytes: Uint8Array): number => {
    assert(
      bytes.length >= sub,
      `bytes length=${bytes.length} must be >= sub=${sub}`,
    );
    return LittleEndian.encode(value, bytes.subarray(0, sub));
  },
  decode: (bytes: Uint8Array): { value: T; readBytes: number } => {
    if (bytes.length < sub) {
      const padded = new Uint8Array(sub).fill(0);
      padded.set(bytes);
      return <{ value: T; readBytes: number }>LittleEndian.decode(padded);
    }
    return <{ value: T; readBytes: number }>(
      LittleEndian.decode(bytes.subarray(0, sub))
    );
  },
  encodedSize: (): number => {
    return sub;
  },
});

export const E_1 = E_sub(1);
export const E_2 = E_sub(2);
export const E_3 = E_sub(3);
export const E_4 = E_sub(4);
export const E_8 = E_sub(8);

/**
 * @see (273) appendix C of the spec
 * @param sub - the number of bytes to encode
 */
export const E_sub_int = <T extends number>(sub: number): JamCodec<T> => ({
  encode: (value: T, bytes: Uint8Array): number => {
    assert(
      bytes.length >= sub,
      `bytes length=${bytes.length} must >= sub=${sub}`,
    );
    return LittleEndian.encode(BigInt(value), bytes.subarray(0, sub));
  },
  decode: (bytes: Uint8Array): { value: T; readBytes: number } => {
    if (bytes.length < sub) {
      const padded = new Uint8Array(sub).fill(0);
      padded.set(bytes);
      const r = LittleEndian.decode(padded);
      return {
        value: Number(r.value) as T,
        readBytes: r.readBytes,
      };
    }
    const r = LittleEndian.decode(bytes.subarray(0, sub));
    return {
      value: Number(r.value) as T,
      readBytes: r.readBytes,
    };
  },
  encodedSize: (): number => {
    return sub;
  },
});

export const E_1_int = E_sub_int<u8>(1);
export const E_2_int = E_sub_int<u16>(2);
export const E_4_int = E_sub_int<u32>(4);
