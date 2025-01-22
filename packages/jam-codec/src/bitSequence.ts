import { JamCodec } from "@/codec.js";
import assert from "node:assert";
export type bit = 0 | 1;

/**
 * $(0.5.4 - C.10)
 */
export const BitSequence: JamCodec<bit[]> = {
  encode: function (value: bit[], bytes: Uint8Array): number {
    const nB = this.encodedSize(value);
    assert.ok(bytes.length >= nB, "bytes not long enough");
    for (let i = 0; i < nB; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        const bit = value[i * 8 + j];
        byte = byte | (bit << j);
      }
      bytes[i] = byte;
    }
    return nB;
  },
  decode: function (bytes: Uint8Array): { value: bit[]; readBytes: number } {
    const nB = bytes.length;
    const value: bit[] = [];
    for (let i = 0; i < nB; i++) {
      const byte = bytes[i];
      for (let j = 0; j < 8; j++) {
        value.push(((byte >> j) & 1) as bit);
      }
    }
    return { value, readBytes: nB };
  },
  encodedSize: function (value: bit[]): number {
    return Math.ceil(value.length / 8);
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("BitSequence", () => {
    describe("encode/decode", () => {
      it("should encode and decode a value", () => {
        const bytes = new Uint8Array(10);
        const a = BitSequence;
        const value: bit[] = [1, 0, 1, 1, 0, 0, 1, 1];
        const encodedLength = a.encode(value, bytes);
        expect(a.decode(bytes.subarray(0, encodedLength)).value).toEqual(value);
      });
      it.fails("should encode and decode a value with 9 elements", () => {
        const bytes = new Uint8Array(10);
        const a = BitSequence;
        const value: bit[] = [1, 0, 1, 1, 0, 0, 1, 1, 1];
        const encodedLength = a.encode(value, bytes);
        expect(
          a.decode(bytes.subarray(0, encodedLength)).value.slice(0, 9),
        ).toEqual(value);
        // this fails
        expect(a.decode(bytes.subarray(0, encodedLength)).value.length).toEqual(
          9,
        );
      });
    });
    describe("encodedSize", () => {
      it("should return 1 for up to 8 bits", () => {
        expect(BitSequence.encodedSize([1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequence.encodedSize([1, 1, 1, 1, 1, 1, 1, 1])).toBe(1);
      });
      it("should return 2 for 9 bits", () => {
        expect(BitSequence.encodedSize([1, 1, 1, 1, 1, 1, 1, 1, 1])).toBe(2);
      });
    });
  });
}
