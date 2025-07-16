import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import {
  binaryCodec,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "./class/mainDecorators";
import { CORES } from "@tsjam/constants";
import { AssuranceExtrinsic, ByteArrayOfLength } from "@tsjam/types";
import { ZipJSONCodecs, BufferJSONCodec } from "./json/codecs.js";
export type bit = 0 | 1;

/**
 * $(0.7.0 - C.9)
 */
export const BitSequenceCodec = (numElements: number): JamCodec<bit[]> => {
  return {
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
      const nB = Math.ceil(numElements / 8); //bytes.length;
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
};

export const bitSequenceCodec = (
  numElements: number,
  jsonKey?: string | typeof SINGLE_ELEMENT_CLASS,
) => {
  return (target: any, propertyKey: string) => {
    binaryCodec(BitSequenceCodec(numElements))(target, propertyKey);
    jsonCodec(
      ZipJSONCodecs(BufferJSONCodec(), {
        fromJSON(json) {
          const bitstring: Array<0 | 1> = [];
          for (let i = 0; i < CORES; i++) {
            const byte = (i / 8) | 0;
            const index = i % 8;

            bitstring.push(((Number(json[byte]) >> index) % 2) as 0 | 1);
          }
          return bitstring as AssuranceExtrinsic["bitstring"];
        },
        toJSON(value) {
          const toRet = Buffer.alloc(Math.floor((value.length + 7) / 8)).fill(
            0,
          );
          for (let i = 0; i < value.length; i++) {
            const byte = (i / 8) | 0;
            const index = i % 8;

            const curVal = toRet[byte];
            toRet[byte] = curVal | (value[i] << index);
          }
          return toRet as unknown as ByteArrayOfLength<number>;
        },
      }),
      jsonKey,
    )(target, propertyKey);
  };
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("BitSequence", () => {
    describe("encode/decode", () => {
      it("should encode and decode a value", () => {
        const bytes = new Uint8Array(8);
        const a = BitSequenceCodec(8);
        const value: bit[] = [1, 0, 1, 1, 0, 0, 1, 1];
        const encodedLength = a.encode(value, bytes);
        console.log(encodedLength);
        expect(a.decode(bytes.subarray(0, encodedLength)).value).toEqual(value);
      });
      it.fails("should encode and decode a value with 9 elements", () => {
        const bytes = new Uint8Array(8);
        const a = BitSequenceCodec(8);
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
        expect(BitSequenceCodec(1).encodedSize([1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1, 1, 1, 1, 1])).toBe(1);
        expect(BitSequenceCodec(1).encodedSize([1, 1, 1, 1, 1, 1, 1, 1])).toBe(
          1,
        );
      });
      it("should return 2 for 9 bits", () => {
        expect(
          BitSequenceCodec(1).encodedSize([1, 1, 1, 1, 1, 1, 1, 1, 1]),
        ).toBe(2);
      });
    });
  });
}
