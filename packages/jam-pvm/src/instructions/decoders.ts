import { readVarIntFromBuffer } from "@/utils/varint";
import { Z, Z_inv } from "@/utils/zed";
import { E_2, E_2_int, E_8, E_sub, encodeWithCodec } from "@tsjam/codec";
import {
  i32,
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import assert from "node:assert";

export const NoArgIxDecoder = () => null;
export type NoArgIxArgs = ReturnType<typeof NoArgIxDecoder>;

// $(0.6.4 - A.20)
export const OneImmIxDecoder = (bytes: Uint8Array) => {
  const lx = Math.min(4, bytes.length);
  const vX = readVarIntFromBuffer(bytes, lx as u8);
  assert(vX <= 255n, "value is too large");
  return { vX: <u8>Number(readVarIntFromBuffer(bytes, lx as u8)) };
};

export type OneImmArgs = ReturnType<typeof OneImmIxDecoder>;

// $(0.6.4 - A.21)
export const OneRegOneExtImmArgsIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;

  const vX = E_8.decode(bytes.subarray(1, 1 + 8)).value;

  return { rA, wA: context.execution.registers[rA], vX };
};

export type OneRegOneExtImmArgs = ReturnType<
  typeof OneRegOneExtImmArgsIxDecoder
>;

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.6.4 - A.22)
 */
export const TwoImmIxDecoder = (bytes: Uint8Array) => {
  let offset = 0;
  const lX = Math.min(4, bytes[0] % 8);
  offset += 1;

  assert(bytes.length >= offset + lX + (lX == 0 ? 1 : 0), "not enough bytes");
  const vX = Number(
    readVarIntFromBuffer(bytes.subarray(offset, offset + lX), lX as u8),
  ) as u32;
  offset += lX;

  const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
  const vY: bigint = readVarIntFromBuffer(
    bytes.subarray(1 + lX, 1 + lX + secondArgLength),
    secondArgLength as u8,
  );
  return { vX, vY };
};

export type TwoImmArgs = ReturnType<typeof TwoImmIxDecoder>;

// $(0.6.4 - A.23)
export const OneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  const lx = Math.min(4, bytes.length);
  const vX =
    BigInt(context.execution.instructionPointer) +
    Z(lx, E_sub(lx).decode(bytes.subarray(0, lx)).value);

  assert(vX >= 0n && vX <= 2n ** 32n, "jump location out of bounds");

  return { vX: <u32>Number(vX) };
};

export type OneOffsetArgs = ReturnType<typeof OneOffsetIxDecoder>;

// $(0.6.4 - A.24)
export const OneRegOneImmIxDecoder = (
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

// $(0.6.4 - A.25)
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
//
// $(0.6.4 - A.26)
export const OneRegOneIMMOneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  // console.log(Buffer.from(bytes).toString("hex"));
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
  // console.log(
  //   "offset data = ",
  //   Buffer.from(bytes.subarray(2 + lx, 1 + lx + ly)).toString("hex"),
  //   ", E_(ly).decode() = ",
  //   E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value,
  //   ", offset =",
  //   offset,
  // );

  // console.log(
  //   "dakk",
  //   Z(2, 63091n),
  //   Z_inv(2, -2275n),
  //   Buffer.from(encodeWithCodec(E_2, Z_inv(2, -2275n))).toString("hex"),
  // );
  const vY = <u32>(context.execution.instructionPointer + offset);
  const wA = context.execution.registers[rA];
  // console.log({ rA, lx, ly, vX, vY, offset });
  return { rA, wA, vX, vY };
};

export type OneRegOneIMMOneOffsetArgs = ReturnType<
  typeof OneRegOneIMMOneOffsetIxDecoder
>;

// $(0.6.4 - A.27)
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

// $(0.6.4 - A.28)
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

// $(0.6.4 - A.29)
export const TwoRegOneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return {
    wA: context.execution.registers[rA],
    wB: context.execution.registers[rB],
    offset,
  };
};

export type TwoRegOneOffsetArgs = ReturnType<typeof TwoRegOneOffsetIxDecoder>;

// $(0.6.4 - A.30)
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

// $(0.6.4 - A.31)
export const ThreeRegIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length >= 2, "not enough bytes (2)");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return {
    rD,
    wA: context.execution.registers[rA],
    wB: context.execution.registers[rB],
  };
};

export type ThreeRegArgs = ReturnType<typeof ThreeRegIxDecoder>;

if (import.meta.vitest) {
  const { beforeAll, describe, expect, it, vi } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  const b = await import("@/utils/branch.js");
  describe("two_reg_one_offset_ixs", () => {
    beforeAll(() => {
      vi.spyOn(b, "branch").mockReturnValue([] as unknown as never);
    });
    describe.skip("decode", () => {
      /* FIXME: reImplement
      it("should decode rA, rB and offset properly", () => {
        expect(decode(new Uint8Array([0]))).toEqual([0, 0, 0]);
        expect(decode(new Uint8Array([1]))).toEqual([1, 0, 0]);
        expect(decode(new Uint8Array([13]))).toEqual([12, 0, 0]);
        expect(decode(new Uint8Array([16]))).toEqual([0, 1, 0]);
        expect(decode(new Uint8Array([16 * 13]))).toEqual([0, 12, 0]);
        expect(decode(new Uint8Array([0, 0xba, 0xcc, 0xe6, 0xaa]))).toEqual([
          0,
          0,
          Z4(0xaae6ccba),
        ]);
      });
      */
    });
  });
  describe("two_imm_ixs", () => {
    describe("decode", () => {
      it("decode just fine", () => {
        expect(
          TwoImmIxDecoder(new Uint8Array([1, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual({ vX: 0x44, vY: 0x33221155n });
        expect(
          TwoImmIxDecoder(new Uint8Array([4, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual({ vX: 0x22115544, vY: 0x33n });
        // mod 8 on first param and min 4
        expect(
          TwoImmIxDecoder(
            new Uint8Array([7 + 8, 0x44, 0x55, 0x11, 0x22, 0x33]),
          ),
        ).toEqual({ vX: 0x22115544, vY: 0x33n });
      });
    });
  });
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

  describe("one_offset_ixs", () => {
    describe("decode", () => {
      it("should decode to 0 if no bytes provided", () => {
        expect(
          OneOffsetIxDecoder(new Uint8Array([]), createEvContext()),
        ).toEqual({ vX: 0 });
      });
      it("should decode to -1", () => {
        const context = createEvContext();
        context.execution.instructionPointer = <u32>2;
        expect(OneOffsetIxDecoder(new Uint8Array([255]), context)).toEqual({
          vX: 1,
        }); // 2 - 1
      });
    });
  });
}
