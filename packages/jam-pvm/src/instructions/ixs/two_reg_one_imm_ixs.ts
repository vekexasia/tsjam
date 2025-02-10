/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { Z, Z4, Z8, Z8_inv } from "@/utils/zed.js";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { Ix, regIx } from "@/instructions/ixdb.js";
import { E_2, E_4, E_8, encodeWithCodec } from "@tsjam/codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { IxMod, X_4, X_8 } from "@/instructions/utils.js";

// $(0.6.1 - A.27)
export const TwoRegOneImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return {
    rA,
    rB,
    vX,
    wA: context.execution.registers[rA],
    wB: context.execution.registers[rB],
  };
};

export type TwoRegOneImmArgs = ReturnType<typeof TwoRegOneImmIxDecoder>;

// # store
class TwoRegOneImmIxs {
  @Ix(120, TwoRegOneImmIxDecoder)
  store_ind_u8({ wB, vX, wA }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB + vX);
    return [
      IxMod.memory(location as u32, new Uint8Array([Number(wA & 0xffn)])),
    ];
  }

  @Ix(121, TwoRegOneImmIxDecoder)
  store_ind_u16({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB + vX);
    return [IxMod.memory(location, encodeWithCodec(E_2, wA & 0xffffn))];
  }

  @Ix(122, TwoRegOneImmIxDecoder)
  store_ind_u32({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB + vX);
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(wA % 2n ** 32n), tmp);
    return [IxMod.memory(location, tmp)];
  }

  @Ix(123, TwoRegOneImmIxDecoder)
  store_ind_u64({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB + vX);
    return [IxMod.memory(location, encodeWithCodec(E_8, wA))];
  }

  // # load unsigned
  @Ix(124, TwoRegOneImmIxDecoder)
  load_ind_u8(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    // TODO: memory fault?
    return [
      IxMod.reg(rA, context.execution.memory.getBytes(location, 1)[0] as u32),
    ];
  }

  @Ix(126, TwoRegOneImmIxDecoder)
  load_ind_u16(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const r = context.execution.memory.getBytes(location, 2);
    // TODO: memory fault?
    return [IxMod.reg(rA, E_2.decode(r).value)];
  }

  @Ix(128, TwoRegOneImmIxDecoder)
  load_ind_u32(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const r = context.execution.memory.getBytes(location, 4);
    // TODO: memory fault?
    return [IxMod.reg(rA, E_4.decode(r).value)];
  }

  @Ix(130, TwoRegOneImmIxDecoder)
  load_ind_u64(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const r = context.execution.memory.getBytes(location, 8);
    // TODO: memory fault?
    return [IxMod.reg(rA, E_8.decode(r).value)];
  }

  // # load signed
  @Ix(125, TwoRegOneImmIxDecoder)
  load_ind_i8(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const raw = context.execution.memory.getBytes(location, 1);
    // TODO: memory fault?
    const val = Z8_inv(Z(1, BigInt(raw[0])));
    return [IxMod.reg(rA, val)];
  }

  @Ix(127, TwoRegOneImmIxDecoder)
  load_ind_i16(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const val = context.execution.memory.getBytes(location, 2);
    // TODO: memory fault?
    const num = E_2.decode(val).value;
    return [IxMod.reg(rA, Z8_inv(Z(2, num)))];
  }

  @Ix(129, TwoRegOneImmIxDecoder)
  load_ind_i32(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContext,
  ) {
    const location = toSafeMemoryAddress(wB + vX);
    const val = context.execution.memory.getBytes(location, 4);
    // TODO: memory fault?
    const num = E_4.decode(val).value;
    return [IxMod.reg(rA, Z8_inv(Z(4, num)))];
  }

  // math
  @Ix(131, TwoRegOneImmIxDecoder)
  add_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((wB + vX) % 2n ** 32n))];
  }

  @Ix(132, TwoRegOneImmIxDecoder)
  and_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB & BigInt(vX))];
  }

  @Ix(133, TwoRegOneImmIxDecoder)
  xor_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB ^ BigInt(vX))];
  }

  @Ix(134, TwoRegOneImmIxDecoder)
  or_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB | BigInt(vX))];
  }

  @Ix(135, TwoRegOneImmIxDecoder)
  mul_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB * BigInt(vX)) % 2n ** 32n)];
  }

  @Ix(136, TwoRegOneImmIxDecoder)
  set_lt_u_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB < vX ? 1 : 0)];
  }

  @Ix(137, TwoRegOneImmIxDecoder)
  set_lt_s_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8(wB) < Z8(BigInt(vX)) ? 1 : 0)];
  }

  @Ix(138, TwoRegOneImmIxDecoder)
  shlo_l_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((wB << vX % 32n) % 2n ** 32n))];
  }

  @Ix(139, TwoRegOneImmIxDecoder)
  shlo_r_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    const wb = Number(wB % 2n ** 32n);
    return [IxMod.reg(rA, X_4(BigInt(wb >>> Number(vX % 32n))))];
  }

  @Ix(140, TwoRegOneImmIxDecoder)
  shar_r_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    const wb = Number(wB % 2n ** 32n);
    return [IxMod.reg(rA, Z8_inv(BigInt(Z4(wb) >> Number(vX % 32n))))];
  }

  @Ix(141, TwoRegOneImmIxDecoder)
  neg_add_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    let val = (vX + 2n ** 32n - wB) % 2n ** 32n;
    if (val < 0n) {
      // other languages behave differently than js when modulo a negative number
      // see comment 3 on pull 3 of jamtestvector.
      val += 2n ** 32n;
    }
    return [IxMod.reg(rA, X_4(val))];
  }

  @Ix(142, TwoRegOneImmIxDecoder)
  set_gt_u_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB > vX ? 1 : 0)];
  }

  @Ix(143, TwoRegOneImmIxDecoder)
  set_gt_s_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8(wB) > Z8(BigInt(vX)) ? 1 : 0)];
  }

  @Ix(144, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((vX << wB % 32n) % 2n ** 32n))];
  }

  @Ix(145, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (Number(vX) >>> Number(wB % 32n)) as u32)];
  }

  @Ix(146, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8_inv(BigInt(Z4(vX % 2n ** 32n)) >> wB % 32n))];
  }

  @Ix(147, TwoRegOneImmIxDecoder)
  cmov_iz_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    if (wB === 0n) {
      return [IxMod.reg(rA, vX)];
    }

    return [];
  }

  @Ix(148, TwoRegOneImmIxDecoder)
  cmov_nz_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    if (wB !== 0n) {
      return [IxMod.reg(rA, vX)];
    }
    return [];
  }

  @Ix(149, TwoRegOneImmIxDecoder)
  add_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB + BigInt(vX)) % 2n ** 64n)];
  }

  @Ix(150, TwoRegOneImmIxDecoder)
  mul_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB * BigInt(vX)) % 2n ** 64n)];
  }

  @Ix(151, TwoRegOneImmIxDecoder)
  shlo_l_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_8((wB << BigInt(vX % 64n)) % 2n ** 64n))];
  }

  @Ix(152, TwoRegOneImmIxDecoder)
  shlo_r_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_8(wB / 2n ** (BigInt(vX) % 64n)))];
  }

  @Ix(153, TwoRegOneImmIxDecoder)
  shar_r_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    const z8b = Z8(wB);
    const dividend = 2n ** (BigInt(vX) % 64n);
    let result = z8b / dividend;
    // Math.floor for negative numbers
    if (z8b < 0n && dividend > 0n && z8b % dividend !== 0n) {
      result -= 1n;
    }
    return [IxMod.reg(rA, Z8_inv(result))];
  }

  @Ix(154, TwoRegOneImmIxDecoder)
  neg_add_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) + 2n ** 64n - wB) % 2n ** 64n)];
  }

  @Ix(155, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) << wB % 64n) % 2n ** 64n)];
  }

  @Ix(156, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) / 2n ** (wB % 64n)) % 2n ** 64n)];
  }

  @Ix(157, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8_inv(Z8(BigInt(vX)) >> wB % 64n))];
  }

  @Ix(158, TwoRegOneImmIxDecoder)
  rot_r_64_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 64n;
    const mask = 2n ** 64n - 1n;
    const value = wB;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return [IxMod.reg(rA, result)];
  }

  @Ix(159, TwoRegOneImmIxDecoder)
  rot_r_64_imm_alt({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB % 64n;
    const mask = 2n ** 64n - 1n;
    const value = vX;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return [IxMod.reg(rA, result)];
  }

  @Ix(160, TwoRegOneImmIxDecoder)
  rot_r_32_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 32n;
    const mask = 2n ** 32n - 1n;
    const value = wB % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return [IxMod.reg(rA, X_4(result))];
  }

  @Ix(161, TwoRegOneImmIxDecoder)
  rot_r_32_imm_alt({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB % 32n;
    const mask = 2n ** 32n - 1n;
    const value = vX % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return [IxMod.reg(rA, X_4(result))];
  }
}
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("two_reg_one_imm_ixs", () => {
    // TODO: fixme
    describe.skip("decode", () => {
      /*it("should decode the imm with boundaries", () => {
        expect(decode(new Uint8Array([0, 0x11]))).toEqual([0, 0, 0x00000011n]);
        expect(decode(new Uint8Array([0, 0x11, 0x22]))).toEqual([
          0,
          0,
          0x00002211n,
        ]);
      });
      it("should decode the imm and allow extra bytes", () => {
        expect(
          decode(new Uint8Array([0, 0x11, 0x22, 0x33, 0x44, 0x55])),
        ).toEqual([0, 0, 0x44332211n]);
      });
    */
    });
  });
}
