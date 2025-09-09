import { JamCodec } from "@/codec";
import assert from "node:assert";
import { LittleEndian } from "@/ints/little-endian";
import { E } from "@/ints/e";

/**
 * E4* encoding allows for variable size encoding for numbers up to 2^29
 * @param value - the value to encode
 */
export const E4star: JamCodec<bigint> = {
  encode: (value: bigint, bytes: Uint8Array): number => {
    assert.ok(value >= 0, "value must be positive");

    if (value < 2 ** (7 * 4)) {
      // e4* encodes exactly as E for values up to 2^28 or 2^(7*4)
      return E.encode(BigInt(value), bytes);
    } else {
      assert.ok(value < 2n ** 29n, "value is too large");
      bytes[0] = Number(2n ** 8n - 2n ** 5n + value / 2n ** 24n);
      LittleEndian.encode(value % 2n ** 24n, bytes.subarray(1, 4));
      return 4;
    }
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    const first = bytes[0];
    if (first < 224) {
      return E.decode(bytes);
    } else {
      const remainder = first - (2 ** 8 - 2 ** 5);
      const decoded = LittleEndian.decode(bytes.subarray(1, 4));
      const value = decoded.value + BigInt(remainder) * 2n ** 24n;
      return {
        value,
        readBytes: decoded.readBytes + 1,
      };
    }
  },
  encodedSize: (): number => {
    throw new Error("Not implemented");
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("E4Star", () => {
    const cases: { v: bigint; bytes: number }[] = [
      { v: 0n, bytes: 1 },
      { v: 1n, bytes: 1 },
      { v: 2n ** (7n * 3n), bytes: 4 },
      { v: 2n ** 29n - 1n, bytes: 4 },
    ];
    for (const value of cases) {
      it(`should encode and decode ${value.v} - in ${value.bytes} bytes`, () => {
        const bytes = Buffer.alloc(value.bytes);
        const used = E4star.encode(value.v, bytes);
        expect(used, "used-bytes").toBe(value.bytes);
        const { value: decoded, readBytes } = E4star.decode(bytes);
        expect(decoded).toBe(value.v);
        expect(readBytes).toBe(value.bytes);
      });
    }
    it("should fail for 2^29 (and above)", () => {
      const bytes = Buffer.alloc(5);
      expect(() => E4star.encode(2n ** 29n, bytes)).toThrow(
        "value is too large",
      );
      expect(() => E4star.encode(2n ** 29n + 1n, bytes)).toThrow(
        "value is too large",
      );
    });
  });
}
