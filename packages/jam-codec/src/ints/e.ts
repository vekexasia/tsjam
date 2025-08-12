import { binaryCodec, jsonCodec } from "@/decorators";
import { JamCodec } from "@/codec";
import { E_8, E_sub } from "@/ints/e-subscr.js";
import { BigIntJSONCodec, NumberJSONCodec } from "@/json/codecs";
import { mapCodec } from "@/utils";
import assert from "node:assert";

/**
 * E encoding allows for variable size encoding for numbers up to 2^64
 * $(0.6.4 - C.6)
 */
export const E: JamCodec<bigint> = {
  encode: (value: bigint, bytes: Uint8Array): number => {
    assert.ok(value >= 0, "value must be positive");
    if (value == 0n) {
      bytes[0] = 0;
      return 1;
    } else if (value < 2 ** (7 * 8)) {
      // 2 ** (7 * 8) = 2 ** 56
      let l = 0;
      for (let i = 1; i < 8; i++) {
        if (value >= 2n ** (7n * BigInt(i))) {
          l = i;
        } else {
          break; // i dont like the break here but it's efficient
        }
      }
      const ln = BigInt(l);
      bytes[0] = Number(2n ** 8n - 2n ** (8n - ln) + value / 2n ** (8n * ln));
      const e = E_sub(l).encode(
        value % 2n ** (8n * ln),
        bytes.subarray(1, l + 1),
      );
      return e + 1;
    } else {
      // encoding from 2 ** 56 to 2 ** 64 - 1 - inclusive
      assert.ok(value < 2n ** 64n, "value is too large");
      bytes[0] = 2 ** 8 - 1; // 255
      E_8.encode(value, bytes.subarray(1, 9));
      return 9; // 1 + 8
    }
  },
  decode: (bytes: Uint8Array): { value: bigint; readBytes: number } => {
    const first = bytes[0];
    if (first == 0) {
      return { value: 0n, readBytes: 1 };
    } else if (first < 255) {
      let l = 0;
      for (let i = 0; i < 8; i++) {
        if (first >= 2 ** 8 - 2 ** (8 - i)) {
          l = i;
        } else {
          break; // i dont like the break here but it's efficient
        }
      }

      const remainder = first - (2 ** 8 - 2 ** (8 - l));
      const xMod2Pow8l = E_sub(l).decode(bytes.subarray(1, l + 1)).value;

      return {
        value: xMod2Pow8l + 2n ** (8n * BigInt(l)) * BigInt(remainder),
        readBytes: l + 1,
      };
    } else {
      // 255
      return {
        value: E_8.decode(bytes.subarray(1, 9)).value,
        readBytes: 9,
      };
    }
  },

  encodedSize: (value: bigint): number => {
    assert.ok(value >= 0, "value must be positive");
    if (value < 2 ** (7 * 8)) {
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

export const E_bigint = <T extends bigint>() =>
  mapCodec(
    E,
    (v) => <T>v,
    (v: T) => v,
  );

export const E_int = <T extends number>() =>
  mapCodec(
    E,
    (v) => <T>Number(v),
    (v: T) => BigInt(v),
  );

export const eBigIntCodec = (jsonKey?: string) => {
  return (target: unknown, propertyKey: string) => {
    binaryCodec(E_bigint())(target, propertyKey);
    jsonCodec(BigIntJSONCodec(), jsonKey)(target, propertyKey);
  };
};

export const eIntCodec = (jsonKey?: string) => {
  return (target: unknown, propertyKey: string) => {
    binaryCodec(E_int())(target, propertyKey);
    jsonCodec(NumberJSONCodec(), jsonKey)(target, propertyKey);
  };
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("E", () => {
    it("should encode from 0 to 255", () => {
      for (let i = 0; i < 256; i++) {
        const bytes = new Uint8Array(10);
        E.encode(BigInt(i), bytes);
        const { value: decoded } = E.decode(bytes);
        expect(decoded).toBe(BigInt(i));
      }
    });
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
