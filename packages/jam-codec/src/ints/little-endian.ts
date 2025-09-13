import { JamCodec } from "@/codec";
import { toBigIntLE, toBufferLE } from "bigint-buffer";
import assert from "node:assert";

/**
 * simple little encoding for positive integers
 * formula (272) of graypaper
 */
export const LittleEndian: JamCodec<bigint> = {
  encode: (value: bigint, bytes: Uint8Array): number => {
    if (bytes.length === 0) {
      return 0;
    }
    assert.ok(value >= 0);
    assert.ok(value < 2 ** (8 * bytes.length));
    bytes.set(toBufferLE(value, bytes.length));
    return bytes.length;
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    return {
      value: toBigIntLE(<Buffer>bytes),
      readBytes: bytes.length, // when this method is being called we know the length
    };
  },
  encodedSize: (): number => {
    throw new Error("Not implemented");
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("LittleEndian", () => {
    const cases = [
      { v: 0n, bytes: 1 },
      { v: 1n, bytes: 1 },
      { v: 128n, bytes: 1 },
      { v: 255n, bytes: 1 },
      { v: 255n, bytes: 1 },
      { v: 2n ** 63n, bytes: 8 },
      { v: 2n ** 64n - 1n, bytes: 8 },
    ];
    for (const value of cases) {
      it(`should encode and decode ${value.v} - in ${value.bytes} bytes`, () => {
        const bytes = Buffer.alloc(value.bytes);
        LittleEndian.encode(value.v, bytes);
        const { value: decoded, readBytes } = LittleEndian.decode(bytes);
        expect(decoded).toBe(value.v);
        expect(readBytes).toBe(value.bytes);
      });
    }
  });
}
