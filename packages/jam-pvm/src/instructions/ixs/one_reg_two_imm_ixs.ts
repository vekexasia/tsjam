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
import { regIx } from "@/instructions/ixdb.js";
import { E_2, E_4 } from "@tsjam/codec";
import { Result, err, ok } from "neverthrow";
import { IxMod } from "../utils";

// $(0.5.0 - A.20)
export const decode = (
  bytes: Uint8Array,
): Result<
  [register: RegisterIdentifier, value1: u32, value2: u32],
  PVMIxDecodeError
> => {
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  if (lx === 0) {
    return err(new PVMIxDecodeError("lx must be > 0"));
  }
  if (bytes.length < lx + 1) {
    return err(new PVMIxDecodeError("not enough bytes"));
  }
  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vx = Number(readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8));
  const vy = Number(readVarIntFromBuffer(bytes.subarray(1 + lx), ly as u8));
  return ok([ra, vx as u32, vy as u32]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<[ra: RegisterIdentifier, vX: u32, vY: u32]>,
) => {
  return regIx<[ra: RegisterIdentifier, vX: u32, vY: u32]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

const store_imm_ind_u8 = create(
  26 as u8,
  "store_imm_ind_u8",
  (context, ri, vx, vy) => {
    const location = context.execution.registers[ri] + BigInt(vx);
    return ok([IxMod.memory(location, new Uint8Array([vy % 0xff]))]);
  },
);

const store_imm_ind_u16 = create(
  54 as u8,
  "store_imm_ind_u16",
  (context, ri, vx, vy) => {
    const location = context.execution.registers[ri] + BigInt(vx);
    const value = vy % 0xffff;
    const tmp = new Uint8Array(2);
    E_2.encode(BigInt(value), tmp);
    return ok([IxMod.memory(location, tmp)]);
  },
);

const store_imm_ind_u32 = create(
  13 as u8,
  "store_imm_ind_u32",
  (context, ri, vx, vy) => {
    const location = context.execution.registers[ri] + BigInt(vx);
    const value = vy % 0xffffffff;
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(value), tmp);
    return ok([IxMod.memory(location, tmp)]);
  },
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  type Mock = import("@vitest/spy").Mock;
  const { createEvContext } = await import("@/test/mocks.js");
  const { runTestIx } = await import("@/test/mocks.js");
  describe("one_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should mod 16 for rA", () => {
        const [rA] = decode(new Uint8Array([16, 0]))._unsafeUnwrap();
        expect(rA).toBe(0);
      });
      it("should disallow lx = 0", () => {
        expect(
          decode(new Uint8Array([0, 0]))._unsafeUnwrapErr().message,
        ).toEqual("lx must be > 0");
      });
      it("should throw if not enough bytes", () => {
        expect(decode(new Uint8Array([16]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
      });
      it("should decode 1Reg2IMM", () => {
        let [rA, vX, vY] = decode(
          new Uint8Array([16, 0x12, 0x11, 0x22, 0x33, 0x44]),
        )._unsafeUnwrap();
        expect(rA).toEqual(0);
        expect(vX).toEqual(0x00000012);
        expect(vY).toEqual(0x44332211);
        [rA, vX, vY] = decode(
          new Uint8Array([16 * 4, 0x12, 0x11, 0x22, 0x33, 0x44]),
        )._unsafeUnwrap();
        expect(rA).toEqual(0);
        expect(vX).toEqual(0x33221112);
        expect(vY).toEqual(0x00000044);
      });
      it("should ignore extra bytes", () => {
        const [, vX, vY] = decode(
          new Uint8Array([
            16, 0x12, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
          ]),
        )._unsafeUnwrap();
        expect(vX).toEqual(0x00000012);
        expect(vY).toEqual(0x44332211);
      });
    });
    describe("ixs", () => {
      it("store_imm_ind_u8", () => {
        const context = createEvContext();
        context.execution.registers[10] = 0x1000n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_imm_ind_u8,
          10,
          0x10 as u32,
          0x12 as u32,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1010, new Uint8Array([0x12])],
        ]);
      });
      it("store_imm_ind_u16", () => {
        const context = createEvContext();
        context.execution.registers[10] = 0x1000n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_imm_ind_u16,
          10,
          0x10 as u32,
          0x1234 as u32,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1010, new Uint8Array([0x34, 0x12])],
        ]);
      });
      it("store_imm_ind_u32", () => {
        const context = createEvContext();
        context.execution.registers[10] = 0x1000n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_imm_ind_u32,
          10,
          0x10 as u32,
          0x12345678 as u32,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1010, new Uint8Array([0x78, 0x56, 0x34, 0x12])],
        ]);
      });
    });
  });
}
