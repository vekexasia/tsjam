import assert from "node:assert";
import { u32, u8 } from "@vekexasia/jam-types";

/**
 * Reads a varint from a buffer. it follows the X formula from the graypaper appendix A.
 * @param buf - buffer to read from
 * @param length - length of the varint
 */
export const readVarIntFromBuffer = (buf: Uint8Array, length: u8) => {
  assert(length <= 4 && length >= 0, "length must be <= 4 and >= 0");
  let result = 0n;
  const lengthN = BigInt(length);
  for (let i = 0n; i < lengthN; i++) {
    result += BigInt(buf[Number(i)]) << (8n * (lengthN - i - 1n));
  }
  if (result & (1n << (8n * lengthN - 1n))) {
    // prepend 1s
    for (let i = 3n; i >= lengthN; i--) {
      result += 0xffn << (8n * i);
    }
  } else {
    // fill the rest with 0s
    result = result << (32n - 8n * lengthN);
    assert(result < 2 ** 32, "result must be < 2**32");
    assert(result >= 0, "result must be >= 0");
  }
  return Number(result) as u32;
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("readVarIntFromBuffer", () => {
    it("should read a 1 byte varint", () => {
      const buffer = new Uint8Array([0b00000001]);
      expect(readVarIntFromBuffer(buffer, 1 as u8)).toBe(
        0b00000001_00000000_00000000_00000000,
      );
    });
    it("should read a 2 byte varint", () => {
      const buffer = new Uint8Array([0b00000001, 0b00000010]);
      expect(readVarIntFromBuffer(buffer, 2 as u8)).toBe(
        0b00000001_00000010_00000000_00000000,
      );
    });
    it("should read a 3 byte varint", () => {
      const buffer = new Uint8Array([0b00000001, 0b00000010, 0b00000011]);
      expect(readVarIntFromBuffer(buffer, 3 as u8)).toBe(
        0b00000001_00000010_00000011_00000000,
      );
    });
    it("should read a 4 byte varint", () => {
      const buffer = new Uint8Array([
        0b00000001, 0b00000010, 0b00000011, 0b00000100,
      ]);
      expect(readVarIntFromBuffer(buffer, 4 as u8)).toBe(
        0b00000001_00000010_00000011_00000100,
      );
    });
    it("should read a 4 byte varint with leading 1s", () => {
      const buffer = new Uint8Array([
        0b11111111, 0b11111110, 0b11111101, 0b11111100,
      ]);

      expect(readVarIntFromBuffer(buffer, 4 as u8)).toBe(
        0b11111111_11111110_11111101_11111100,
      );
    });
    it("should read a 3 byte varint with leading 1s", () => {
      const buffer = new Uint8Array([0b10001111, 0b11111110, 0b11111101]);
      console.log(readVarIntFromBuffer(buffer, 3 as u8).toString(2));
      expect(readVarIntFromBuffer(buffer, 3 as u8)).toBe(
        0b11111111_10001111_11111110_11111101,
      );
    });
    it("should read 1 byte varint with leading 1s", () => {
      const buffer = new Uint8Array([0xf6]);

      expect(readVarIntFromBuffer(buffer, 1 as u8)).toBe(0xfffffff6);
    });
  });
}
