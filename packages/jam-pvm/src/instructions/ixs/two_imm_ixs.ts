import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { LittleEndian } from "@vekexasia/jam-codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * @param bytes
 */
export const decode = (bytes: Uint8Array): [vX: u32, vY: u32] => {
  let offset = 0;
  const lX = Math.min(4, bytes[0] % 8);
  offset += 1;

  assert(bytes.length >= offset + lX + (lX == 0 ? 1 : 0), "not enough bytes");
  const first: u32 = readVarIntFromBuffer(
    bytes.subarray(offset, offset + lX),
    lX as u8,
  );
  offset += lX;

  const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
  const second: u32 = readVarIntFromBuffer(
    bytes.subarray(1 + lX, 1 + lX + secondArgLength),
    secondArgLength as u8,
  );
  return [first, second];
};

const create = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[vX: u32, vY: u32]>,
) => {
  return regIx({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
    },
  });
};

const store_imm_u8 = create(
  62 as u8,
  "store_imm_u8",
  (context, offset, value) => {
    context.memory.set(offset, (value % 256) as u8);
  },
);

const store_imm_u16 = create(
  79 as u8,
  "store_imm_u16",
  (context, offset, value) => {
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(value % 2 ** 16), tmp);
    context.memory.setBytes(offset, tmp);
  },
);

const store_imm_u32 = create(
  38 as u8,
  "store_imm_u32",
  (context, offset, value) => {
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(offset, tmp);
  },
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("../../../test/mocks.js");
  type Mock = import("@vitest/spy").Mock;
  describe("two_imm_ixs", () => {
    describe("decode", () => {
      it("decode just fine", () => {
        expect(decode(new Uint8Array([0, 0]))).toEqual([0, 0]);
        expect(decode(new Uint8Array([1, 0x44]))).toEqual([0x44000000, 0]);
        expect(decode(new Uint8Array([0, 0x44]))).toEqual([0, 0x44000000]);
        expect(
          decode(new Uint8Array([1, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual([0x44000000, 0x55112233]);
        expect(
          decode(new Uint8Array([4, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual([0x44551122, 0x33000000]);
        // mod 8 on first param and min 4
        expect(
          decode(new Uint8Array([7 + 8, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual([0x44551122, 0x33000000]);
      });
      it("should throw if not enough bytes", () => {
        expect(() => decode(new Uint8Array([0]))).toThrow("not enough bytes");
        expect(() => decode(new Uint8Array([1]))).toThrow("not enough bytes");
        expect(() => decode(new Uint8Array([2, 0]))).toThrow(
          "not enough bytes",
        );
      });
    });
    describe("ixs", () => {
      it("store_imm_u8", () => {
        const context = createEvContext();
        store_imm_u8.evaluate(context, 0x100 as u32, 0x4422 as u32);
        expect((context.memory.set as Mock).mock.calls).toEqual([
          [0x100, 0x22],
        ]);
      });
      it("store_imm_u16", () => {
        const context = createEvContext();
        store_imm_u16.evaluate(context, 0x100 as u32, 0x44221133 as u32);
        expect((context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x100, new Uint8Array([0x33, 0x11])],
        ]);
      });
      it("store_imm_u32", () => {
        const context = createEvContext();
        store_imm_u32.evaluate(context, 0x100 as u32, 0x44221133 as u32);
        expect((context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x100, new Uint8Array([0x33, 0x11, 0x22, 0x44])],
        ]);
      });
    });
  });
}
