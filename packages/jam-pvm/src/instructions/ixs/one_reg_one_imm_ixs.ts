import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { djump } from "@/utils/djump.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { BlockTermination, Ix } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_2, E_2_int, E_4, E_4_int, E_8, encodeWithCodec } from "@tsjam/codec";
import { IxMod, X_4, X_fn } from "@/instructions/utils.js";

// $(0.6.1 - A.23)
const OneRegOneImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = <RegisterValue>readVarIntFromBuffer(bytes.subarray(1), lx as u8);
  return { rA, vX, wA: context.execution.registers[rA] };
};

export type OneRegOneImmArgs = ReturnType<typeof OneRegOneImmIxDecoder>;

class OneRegOneImmIxs {
  @BlockTermination
  @Ix(50, OneRegOneImmIxDecoder)
  jump_ind({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const jumpLocation = Number((wA + vX) % 2n ** 32n) as u32;
    return [djump(context, jumpLocation)];
  }

  // ### Load unsigned
  @Ix(51, OneRegOneImmIxDecoder)
  load_imm({ rA, vX }: OneRegOneImmArgs) {
    return [IxMod.reg(rA, vX)];
  }

  @Ix(52, OneRegOneImmIxDecoder)
  load_u8({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return [...IxMod.pageFault(memoryAddress)];
    }

    return [
      IxMod.reg(
        rA,
        context.execution.memory.getBytes(memoryAddress, 1)[0] as number as u32,
      ),
    ];
  }

  @Ix(54, OneRegOneImmIxDecoder)
  load_u16({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return [...IxMod.pageFault(memoryAddress)];
    }
    return [
      IxMod.reg(
        rA,
        E_2_int.decode(context.execution.memory.getBytes(memoryAddress, 2))
          .value,
      ),
    ];
  }

  @Ix(56, OneRegOneImmIxDecoder)
  load_u32({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 4)) {
      return [...IxMod.pageFault(memoryAddress)];
    }
    return [
      IxMod.reg(
        rA,
        E_4_int.decode(context.execution.memory.getBytes(memoryAddress, 4))
          .value,
      ),
    ];
  }

  @Ix(58, OneRegOneImmIxDecoder)
  load_u64({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 8)) {
      return [...IxMod.pageFault(memoryAddress)];
    }
    return [
      IxMod.reg(
        rA,
        E_8.decode(context.execution.memory.getBytes(memoryAddress, 8)).value,
      ),
    ];
  }

  // ### Load signed
  @Ix(53, OneRegOneImmIxDecoder)
  load_i8({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return [...IxMod.pageFault(memoryAddress)];
    }

    return [
      IxMod.reg(
        rA,
        X_fn(1n)(
          BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0]),
        ),
      ),
    ];
  }

  @Ix(55, OneRegOneImmIxDecoder)
  load_i16({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return [...IxMod.pageFault(memoryAddress)];
    }

    return [
      IxMod.reg(
        rA,
        X_fn(2n)(
          E_2.decode(context.execution.memory.getBytes(memoryAddress, 2)).value,
        ),
      ),
    ];
  }

  @Ix(57, OneRegOneImmIxDecoder)
  load_i32({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContext) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return [...IxMod.pageFault(memoryAddress)];
    }

    return [
      IxMod.reg(
        rA,
        X_4(
          E_4.decode(context.execution.memory.getBytes(memoryAddress, 4)).value,
        ),
      ),
    ];
  }

  // ### Store

  @Ix(59, OneRegOneImmIxDecoder)
  store_u8({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, new Uint8Array([Number(wA % 256n)]))];
  }

  @Ix(60, OneRegOneImmIxDecoder)
  store_u16({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_2, wA % 2n ** 16n))];
  }

  @Ix(61, OneRegOneImmIxDecoder)
  store_u32({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_4, wA % 2n ** 32n))];
  }

  @Ix(62, OneRegOneImmIxDecoder)
  store_u64({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_8, wA))];
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("one_reg_one_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if no input bytes", () => {
        expect(() =>
          OneRegOneImmIxDecoder(new Uint8Array([]), createEvContext()),
        ).toThrow("no input bytes");
      });
      it("should ignore extra bytes", () => {
        const { vX } = OneRegOneImmIxDecoder(
          new Uint8Array([
            1, 0b00000001, 0b00000010, 0b00000010, 0b00000010, 1,
          ]),
          createEvContext(),
        );
        expect(vX).toBe(0b00000010_00000010_00000010_00000001n);
      });
    });
  });
}
