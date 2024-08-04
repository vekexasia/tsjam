import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";

const decode = (
  bytes: Uint8Array,
): [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32] => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  assert(bytes.length >= 2, "not enough bytes [1]");
  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  assert(bytes.length >= 2 + lX, "not enough bytes [2]");
  const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8);
  const vY = readVarIntFromBuffer(
    bytes.subarray(2 + lX, 2 + lX + lY),
    lY as u8,
  );

  return [rA, rB, vX, vY];
};

const create = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32]
  >,
  blockTermination?: true,
) => {
  return regIx<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32]
  >({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode,
      evaluate,
    },
  });
};

export const load_imm_jump_ind = create(
  42 as u8,
  "load_imm_jump_ind",
  (context, rA, rB, vx, vy) => {
    context.registers[rA] = vx;
    return djump(context, ((context.registers[rB] + vy) % 2 ** 32) as u32);
  },
  true,
);

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  vi.mock("@/utils/djump.js", () => ({
    djump: vi.fn(),
  }));
  const { createEvContext } = await import("../../../test/mocks.js");
  describe("two_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if not enough bytes", () => {
        expect(() => decode(new Uint8Array([]))).toThrow(
          "not enough bytes [1]",
        );
        expect(() => decode(new Uint8Array([0]))).toThrow(
          "not enough bytes [1]",
        );
        expect(() => decode(new Uint8Array([0, 1]))).toThrow(
          "not enough bytes [2]",
        );
      });
      it("should decode rA, rB, vx and vy properly", () => {
        expect(decode(new Uint8Array([0, 0]))).toEqual([0, 0, 0, 0]);
        expect(decode(new Uint8Array([1 + 16, 0]))).toEqual([1, 1, 0, 0]);
        expect(decode(new Uint8Array([13, 0]))).toEqual([12, 0, 0, 0]);
        expect(decode(new Uint8Array([13 * 16, 0]))).toEqual([0, 12, 0, 0]);
        expect(decode(new Uint8Array([0, 1, 0x11]))).toEqual([
          0, 0, 0x11000000, 0,
        ]);
        expect(decode(new Uint8Array([1, 0, 0x11]))).toEqual([
          1, 0, 0, 0x11000000,
        ]);
      });
    });
    describe("ixs", () => {
      it("load_imm_jump_ind", () => {
        const context = createEvContext();
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xfffffffe as u32;
        load_imm_jump_ind.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          0xdeadbeef as u32,
          0x00000003 as u32,
        );
        expect(djump).toHaveBeenCalledWith(context, 1);
        expect(context.registers[0]).toBe(0xdeadbeef);
      });
    });
  });
}
