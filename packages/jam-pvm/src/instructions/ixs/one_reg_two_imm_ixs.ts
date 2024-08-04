import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";

export const decode = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, value1: u32, value2: u32] => {
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(lx !== 0, "lx must be > 0");
  assert(bytes.length >= lx + 1, "not enough bytes");
  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vx = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8);
  const vy = readVarIntFromBuffer(bytes.subarray(1 + lx), ly as u8);
  return [ra, vx, vy];
};

const create = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[ra: RegisterIdentifier, vX: u32, vY: u32]>,
) => {
  return regIx<[ra: RegisterIdentifier, vX: u32, vY: u32]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
    },
  });
};

const store_imm_ind_u8 = create(
  26 as u8,
  "store_imm_ind_u8",
  (context, ri, vx, vy) => {
    context.memory.set(context.registers[ri] + vx, (vy % 0xff) as u8);
  },
);

const store_imm_ind_u16 = create(
  54 as u8,
  "store_imm_ind_u16",
  (context, ri, vx, vy) => {
    const value = vy % 0xffff;
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(context.registers[ri] + vx, tmp);
  },
);

const store_imm_ind_u32 = create(
  13 as u8,
  "store_imm_ind_u32",
  (context, ri, vx, vy) => {
    const value = vy % 0xffffffff;
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(context.registers[ri] + vx, tmp);
  },
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  type Mock = import("@vitest/spy").Mock;
  const { createEvContext } = await import("../../../test/mocks.js");
  describe("one_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should mod 16 for rA", () => {
        const [rA] = decode(new Uint8Array([16, 0]));
        expect(rA).toBe(0);
      });
      it("should disallow lx = 0", () => {
        expect(() => decode(new Uint8Array([0, 0]))).toThrow("lx must be > 0");
      });
      it("should throw if not enough bytes", () => {
        expect(() => decode(new Uint8Array([16]))).toThrow("not enough bytes");
      });
      it("should decode 1Reg2IMM", () => {
        let [rA, vX, vY] = decode(
          new Uint8Array([16, 0x12, 0x11, 0x22, 0x33, 0x44]),
        );
        expect(rA).toEqual(0);
        expect(vX).toEqual(0x12000000);
        expect(vY).toEqual(0x11223344);
        [rA, vX, vY] = decode(
          new Uint8Array([16 * 4, 0x12, 0x11, 0x22, 0x33, 0x44]),
        );
        expect(rA).toEqual(0);
        expect(vX).toEqual(0x12112233);
        expect(vY).toEqual(0x44000000);
      });
      it("should ignore extra bytes", () => {
        const [, vX, vY] = decode(
          new Uint8Array([
            16, 0x12, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
          ]),
        );
        expect(vX).toEqual(0x12000000);
        expect(vY).toEqual(0x11223344);
      });
    });
    describe("ixs", () => {
      it("store_imm_ind_u8", () => {
        const context = createEvContext();
        context.registers[10] = 0x1000 as u32;
        store_imm_ind_u8.evaluate(
          context,
          10 as RegisterIdentifier,
          0x10 as u32,
          0x12 as u32,
        );
        expect((context.memory.set as Mock).mock.calls).toEqual([
          [0x1010, 0x12],
        ]);
      });
      it("store_imm_ind_u16", () => {
        const context = createEvContext();
        context.registers[10] = 0x1000 as u32;
        store_imm_ind_u16.evaluate(
          context,
          10 as RegisterIdentifier,
          0x10 as u32,
          0x1234 as u32,
        );
        expect((context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1010, new Uint8Array([0x34, 0x12])],
        ]);
      });
      it("store_imm_ind_u32", () => {
        const context = createEvContext();
        context.registers[10] = 0x1000 as u32;
        store_imm_ind_u32.evaluate(
          context,
          10 as RegisterIdentifier,
          0x10 as u32,
          0x12345678 as u32,
        );
        expect((context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1010, new Uint8Array([0x78, 0x56, 0x34, 0x12])],
        ]);
      });
    });
  });
}
