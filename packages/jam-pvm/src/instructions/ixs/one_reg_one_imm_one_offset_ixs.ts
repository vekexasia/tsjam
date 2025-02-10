import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { branch } from "@/utils/branch.js";
import { Z } from "@/utils/zed.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { Ix, BlockTermination } from "@/instructions/ixdb.js";
import { E_sub } from "@tsjam/codec";
import assert from "node:assert";
import { IxMod } from "../utils";

// $(0.6.1 - A.25
export const OneRegOneIMMOneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(
    bytes.subarray(1, 1 + lx),
    lx as u8,
  ) as RegisterValue;
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset
  const offset = Number(
    Z(ly, E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value),
  ) as u32;

  const vY = <u32>(context.execution.instructionPointer + offset);
  return { rA, wA: context.execution.registers[rA], vX, vY };
};

export type OneRegOneIMMOneOffsetArgs = ReturnType<
  typeof OneRegOneIMMOneOffsetIxDecoder
>;

class OneRegOneImmOneOffsetIxs {
  @Ix(80, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  load_imm_jump(
    { rA, vX, vY }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return [...branch(context, vY, true), IxMod.reg(rA, vX)];
  }

  @Ix(81, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_eq_imm(
    { wA, vX, vY }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA === vX);
  }

  @Ix(82, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ne_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA != vX);
  }

  @Ix(83, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA < vX);
  }

  @Ix(84, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_le_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA <= vX);
  }

  @Ix(85, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA >= vX);
  }

  @Ix(86, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_gt_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, wA > vX);
  }

  @Ix(87, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, Z(8, wA) < Z(8, vX));
  }

  @Ix(88, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_le_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, Z(8, wA) <= Z(8, vX));
  }

  @Ix(89, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, Z(8, wA) >= Z(8, vX));
  }

  @Ix(90, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_gt_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    return branch(context, vY, Z(8, wA) > Z(8, vX));
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe.skip("decode", () => {
    const encodeRaLx = (ra: number, lx: number) => {
      return ra + lx * 16;
    };
    // TODO: implement decode test
    /**
    it("should decode 1Reg1IMM1Offset", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 1), 0x12, 0x00, 0x00, 0x11]),
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x12n);
      expect(offset).toEqual(0x110000);
    });
    it("should max use 4 if lx > 4 and 1 for offset", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 6), 0x12, 0x00, 0x00, 0x11, 1]),
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x11000012n);
      expect(offset).toEqual(1);
    });
    it("should discard extra bytes", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([
          encodeRaLx(1, 4),
          0x12,
          0x00,
          0x00,
          0x11,
          0x00,
          0x00,
          0x00,
          0x00,
          1, // extra byte
        ]),
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x11000012n);
      expect(offset).toEqual(0);
    });
    describe("errors", () => {
      it("should fail if no input bytes", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "no input bytes",
        );
      });
      it("should fail if not enough bytes", () => {
        expect(
          decode(new Uint8Array([encodeRaLx(1, 1)]))._unsafeUnwrapErr().message,
        ).toEqual("not enough bytes");
      });
    });
    */
  });
}
