import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { BlockTermination, Ix, Ixdb, regIx } from "@/instructions/ixdb.js";
import { IxMod } from "../utils";
import assert from "node:assert";

// $(0.6.1 - A.29)
export const TwoRegTwoImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
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

  return {
    vX,
    vY,
    rA,
    wA: context.execution.registers[rA],
    wB: context.execution.registers[rB],
  };
};

export type TwoRegTwoImmIxArgs = ReturnType<typeof TwoRegTwoImmIxDecoder>;

class TwoRegTwoImmIxs {
  @Ix(180, TwoRegTwoImmIxDecoder)
  @BlockTermination
  load_imm_jump_ind(args: TwoRegTwoImmIxArgs, context: PVMIxEvaluateFNContext) {
    return [
      IxMod.reg(args.rA, args.vX),
      ...djump(context, Number((args.wB + args.vY) % 2n ** 32n) as u32),
    ];
  }
}
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks");
  describe("two_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if not enough bytes", () => {
        expect(() =>
          TwoRegTwoImmIxDecoder(new Uint8Array([]), createEvContext()),
        ).to.throw("not enough bytes [1]");
        expect(() =>
          TwoRegTwoImmIxDecoder(new Uint8Array([0]), createEvContext()),
        ).to.throw("not enough bytes [1]");
        expect(() =>
          TwoRegTwoImmIxDecoder(new Uint8Array([0, 1]), createEvContext()),
        ).to.throw("not enough bytes [2]");
      });
    });
  });
}
