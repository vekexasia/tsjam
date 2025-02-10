import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  RegisterValue,
  u8,
} from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { Ix } from "@/instructions/ixdb.js";
import { E_2, E_4, E_8, encodeWithCodec } from "@tsjam/codec";
import { IxMod } from "../utils";
import assert from "node:assert";

// $(0.6.1 - A.24)
export const OneRegTwoImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8);
  const vY = readVarIntFromBuffer(bytes.subarray(1 + lx), ly as u8);
  return { wA: context.execution.registers[ra], vX, vY };
};

export type OneRegTwoImmArgs = ReturnType<typeof OneRegTwoImmIxDecoder>;

class OneRegTwoImmIxs {
  @Ix(70, OneRegTwoImmIxDecoder)
  store_imm_ind_u8({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA + vX;
    return [IxMod.memory(location, new Uint8Array([Number(vY % 0xffn)]))];
  }

  @Ix(71, OneRegTwoImmIxDecoder)
  store_imm_ind_u16({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA + vX;
    return [IxMod.memory(location, encodeWithCodec(E_2, vY % 2n ** 16n))];
  }

  @Ix(72, OneRegTwoImmIxDecoder)
  store_imm_ind_u32({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA + vX;
    return [IxMod.memory(location, encodeWithCodec(E_4, vY % 2n ** 32n))];
  }

  @Ix(73, OneRegTwoImmIxDecoder)
  store_imm_ind_u64({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA + vX;
    return [IxMod.memory(location, encodeWithCodec(E_8, vY))];
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("one_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should throw if not enough bytes", () => {
        expect(() =>
          OneRegTwoImmIxDecoder(new Uint8Array([16]), createEvContext()),
        ).to.throw("not enough bytes");
      });
      it("should decode 1Reg2IMM", () => {
        const context = createEvContext();
        context.execution.registers[0] = <RegisterValue>1n;
        const { wA, vX, vY } = OneRegTwoImmIxDecoder(
          new Uint8Array([16, 0x12, 0x11, 0x22, 0x33, 0x44]),
          context,
        );
        expect(wA).toEqual(1n);
        expect(vX).toEqual(0x00000012n);
        expect(vY).toEqual(0x44332211n);
      });
      it("should ignore extra bytes", () => {
        const { vX, vY } = OneRegTwoImmIxDecoder(
          new Uint8Array([
            16, 0x12, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
          ]),
          createEvContext(),
        );
        expect(vX).toEqual(0x00000012n);
        expect(vY).toEqual(0x44332211n);
      });
    });
  });
}
