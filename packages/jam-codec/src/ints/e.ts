import { JamCodec } from "@/codec";
import assert from "node:assert";
import { LittleEndian } from "@/ints/littleEndian";

/**
 * E encoding allows for variable size encoding for numbers up to 2^64
 */
export const E: JamCodec<bigint> = {
  encode: (value: bigint, bytes: Uint8Array): number => {
    assert.ok(value >= 0, "value must be positive");
    if (value < 2 ** (7 * 9)) {
      // 2 ** (7 * 9) = 2 ** 63
      let l = 0;
      for (let i = 1; i < 9; i++) {
        if (value >= 2n ** (7n * BigInt(i))) {
          l = i;
        } else {
          break; // i dont like the break here but it's efficient
        }
      }
      const ln = BigInt(l);
      bytes[0] = Number(2n ** 8n - 2n ** (8n - ln) + value / 2n ** (8n * ln));
      const e = LittleEndian.encode(
        value % 2n ** (8n * ln),
        bytes.subarray(1, l + 1),
      );
      return e + 1;
    } else {
      // encoding from 2 ** 63 to 2 ** 64 - 1 - inclusive
      assert.ok(value < 2n ** 64n, "value is too large");
      bytes[0] = 2 ** 8 - 1; // 255
      LittleEndian.encode(value, bytes.subarray(1, 9));
      return 9; // 1 + 8
    }
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    const first = bytes[0];
    if (first === 255) {
      const decoded = LittleEndian.decode(bytes.subarray(1, 9));
      return {
        value: decoded.value,
        readBytes: decoded.readBytes + 1,
      };
    } else {
      let l = 0;
      for (let i = 0; i < 8; i++) {
        if (first >= 2 ** 8 - 2 ** (8 - i)) {
          l = i;
        } else {
          break; // i dont like the break here but it's efficient
        }
      }
      const quotient = BigInt(first - (2 ** 8 - 2 ** (8 - l)));
      const decoded = LittleEndian.decode(bytes.subarray(1, l + 1));
      const value = quotient * 2n ** (8n * BigInt(l)) + decoded.value;
      return {
        value,
        readBytes: decoded.readBytes + 1,
      };
    }
  },
  encodedSize: (value: bigint): number => {
    assert.ok(value >= 0, "value must be positive");
    if (value < 2 ** (7 * 9)) {
      let l = 0;
      for (let i = 1; i < 9; i++) {
        if (value >= 2n ** (7n * BigInt(i))) {
          l = i;
        } else {
          break; // i dont like the break here but it's efficient
        }
      }
      return 1 + l;
    } else {
      return 9;
    }
  },
};
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("E", () => {
    const cases = [
      { v: 0n, bytes: 1 },
      { v: 1n, bytes: 1 },
      { v: 2n ** 7n - 1n, bytes: 1 },
      { v: 2n ** 7n, bytes: 2 },
      { v: 2n ** (7n * 2n) - 1n, bytes: 2 },
      { v: 2n ** (7n * 2n), bytes: 3 },
      { v: 256n, bytes: 2 },
      { v: 2n ** (7n * 8n) - 1n, bytes: 8 },
      { v: 2n ** 63n, bytes: 9 },
      { v: 2n ** 64n - 1n, bytes: 9 },
    ];
    for (const value of cases) {
      it(`should encode and decode ${value.v} - in ${value.bytes} bytes`, () => {
        const bytes = new Uint8Array(10);
        const written = E.encode(value.v, bytes);
        expect(written, "written-bytes").toBe(value.bytes);
        const { value: decoded, readBytes } = E.decode(bytes);
        expect(decoded).toBe(value.v);
        expect(readBytes, "read-bytes").toBe(value.bytes);
      });
      it(`should calculate encoded size for ${value.v} equal to encodedSize`, () => {
        const bytes = new Uint8Array(10);
        const written = E.encode(value.v, bytes);
        expect(written, "written-bytes").toBe(value.bytes);
        expect(E.encodedSize(value.v), "encodedSize").toBe(value.bytes);
      });
    }
    it("fails for 2^64", () => {
      const bytes = new Uint8Array(10);
      expect(() => E.encode(2n ** 64n, bytes)).toThrow("value is too large");
    });
  });
}
