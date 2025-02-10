import {
  Gas,
  PVMIxEvaluateFN,
  PVMIxEvaluateFNContext,
  PVMRegisters,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { Ix, regIx } from "@/instructions/ixdb.js";
import { IxMod } from "@/instructions/utils.js";
import { Z8_inv, Z } from "@/utils/zed";
import assert from "node:assert";

// $(0.6.1 - A.26)
export const TwoRegIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rD = <RegisterIdentifier>Math.min(12, bytes[0] % 16);
  const rA = <RegisterIdentifier>Math.min(12, Math.floor(bytes[0] / 16));
  return { rD, wA: context.execution.registers[rA] };
};

export type TwoRegArgs = ReturnType<typeof TwoRegIxDecoder>;

class TwoRegIxs {
  @Ix(100, TwoRegIxDecoder)
  move_reg({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, wA)];
  }

  @Ix(101, TwoRegIxDecoder)
  sbrk({ rD, wA }: TwoRegArgs, context: PVMIxEvaluateFNContext) {
    const location = context.execution.memory.firstWriteableInHeap(
      <u32>Number(wA),
    )!;

    return [IxMod.reg(rD, location)];
  }

  @Ix(102, TwoRegIxDecoder)
  count_set_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa;
    for (let i = 0; i < 64; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return [IxMod.reg(rD, sum)];
  }

  @Ix(103, TwoRegIxDecoder)
  count_set_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa % 2n ** 32n;
    for (let i = 0; i < 32; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return [IxMod.reg(rD, sum)];
  }

  @Ix(104, TwoRegIxDecoder)
  leading_zero_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << (63n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(105, TwoRegIxDecoder)
  leading_zero_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << (31n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(106, TwoRegIxDecoder)
  trailing_zero_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(107, TwoRegIxDecoder)
  trailing_zero_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(108, TwoRegIxDecoder)
  sign_extend_8({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, Z8_inv(Z(1, wA % 2n ** 8n)))];
  }

  @Ix(109, TwoRegIxDecoder)
  sign_extend_16({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, Z8_inv(Z(2, wA % 2n ** 16n)))];
  }

  @Ix(110, TwoRegIxDecoder)
  zero_extend_16({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, wA % 2n ** 16n)];
  }

  @Ix(111, TwoRegIxDecoder)
  reverse_bytes({ rD, wA }: TwoRegArgs) {
    let newVal = 0n;
    const wa = wA;
    for (let i = 0; i < 8; i++) {
      newVal |= ((wa >> BigInt(i * 8)) & 0xffn) << BigInt((7 - i) * 8);
    }
    return [IxMod.reg(rD, newVal)];
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("two_reg_ixs", () => {
    describe.skip("decode", () => {
      // TODO: REIMPLEMent
      /*
      it("should decode rD and rA properly", () => {
        expect(decode(new Uint8Array([13]))._unsafeUnwrap()).toEqual([12, 0]);
        expect(decode(new Uint8Array([1]))._unsafeUnwrap()).toEqual([1, 0]);
        expect(decode(new Uint8Array([1 + 1 * 16]))._unsafeUnwrap()).toEqual([
          1, 1,
        ]);
        expect(decode(new Uint8Array([1 + 13 * 16]))._unsafeUnwrap()).toEqual([
          1, 12,
        ]);
        expect(
          decode(
            new Uint8Array([1 + 13 * 16, 0xba, 0xcc, 0xe6, 0xaa]),
          )._unsafeUnwrap(),
        ).toEqual([1, 12]);
      });
      it("should fail if no bytes provided", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
      });
      */
    });
  });
}
