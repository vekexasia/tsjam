import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { regIx } from "@/instructions/ixdb.js";
import { Result, err, ok } from "neverthrow";

// $(0.5.4 - A.27)
const decode = (
  bytes: Uint8Array,
): Result<
  [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32],
  PVMIxDecodeError
> => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  if (bytes.length < 2) {
    return err(new PVMIxDecodeError("not enough bytes [1]"));
  }

  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  if (bytes.length < 2 + lX) {
    return err(new PVMIxDecodeError("not enough bytes [2]"));
  }
  const vX = Number(readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8));
  const vY = Number(
    readVarIntFromBuffer(bytes.subarray(2 + lX, 2 + lX + lY), lY as u8),
  );

  return ok([rA, rB, vX as u32, vY as u32]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<
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
      gasCost: 1n as Gas,
    },
  });
};

export const load_imm_jump_ind = create(
  160 as u8,
  "load_imm_jump_ind",
  (context, rA, rB, vx, vy) => {
    context.execution.registers[rA] = BigInt(vx) as RegisterValue;

    return djump(
      context,
      Number((context.execution.registers[rB] + BigInt(vy)) % 2n ** 32n) as u32,
    );
  },
  true,
);

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  vi.mock("@/utils/djump.js", () => ({
    djump: vi.fn(),
  }));
  const { createEvContext } = await import("@/test/mocks.js");
  describe("two_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if not enough bytes", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes [1]",
        );
        expect(decode(new Uint8Array([0]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes [1]",
        );
        expect(
          decode(new Uint8Array([0, 1]))._unsafeUnwrapErr().message,
        ).toEqual("not enough bytes [2]");
      });
      it("should decode rA, rB, vx and vy properly", () => {
        expect(decode(new Uint8Array([0, 0]))._unsafeUnwrap()).toEqual([
          0, 0, 0, 0,
        ]);
        expect(decode(new Uint8Array([1 + 16, 0]))._unsafeUnwrap()).toEqual([
          1, 1, 0, 0,
        ]);
        expect(decode(new Uint8Array([13, 0]))._unsafeUnwrap()).toEqual([
          12, 0, 0, 0,
        ]);
        expect(decode(new Uint8Array([13 * 16, 0]))._unsafeUnwrap()).toEqual([
          0, 12, 0, 0,
        ]);
        expect(decode(new Uint8Array([0, 1, 0x11]))._unsafeUnwrap()).toEqual([
          0, 0, 0x11, 0,
        ]);
        expect(decode(new Uint8Array([1, 0, 0x11]))._unsafeUnwrap()).toEqual([
          1, 0, 0, 0x11,
        ]);
      });
    });
    describe("ixs", () => {
      it("load_imm_jump_ind", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xfffffffen as RegisterValue;
        load_imm_jump_ind.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          0xdeadbeef as u32,
          0x00000003 as u32,
        );
        expect(djump).toHaveBeenCalledWith(context, 1);
        expect(context.execution.registers[0]).toBe(0xdeadbeefn);
      });
    });
  });
}
