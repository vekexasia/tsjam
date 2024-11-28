import { Result, err, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  PVMIxExecutionError,
  RegisterIdentifier,
  RegisterValue,
  u16,
  u32,
  u64,
  u8,
} from "@tsjam/types";
import { Z, Z4, Z4_inv, Z_inv } from "@/utils/zed.js";
import { djump } from "@/utils/djump.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_2, E_4 } from "@tsjam/codec";
import { IxMod, MemoryUnreadable } from "@/instructions/utils.js";

type InputType = [register: RegisterIdentifier, value: u64];

// $(0.5.0 - A.19)
const decode = (bytes: Uint8Array): Result<InputType, PVMIxDecodeError> => {
  assert(bytes.length > 0, "no input bytes");
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 1));
  const vx = readVarIntFromBuffer(bytes.subarray(1), lx as u8);
  return ok([ra, vx]);
};

const create1Reg1IMMIx = (
  opCode: u8,
  identifier: string,
  evaluate: PVMIxEvaluateFN<InputType, PVMIxExecutionError>,
  blockTermination?: true,
) => {
  return regIx({
    opCode,
    identifier,
    blockTermination,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const jump_ind = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.execution.registers[ri];
    const jumpLocation = Number((wa + vx) % 2n ** 32n) as u32;
    return djump(context, jumpLocation);
  },
  true,
);

// ### Load unsigned
const load_imm = create1Reg1IMMIx(4 as u8, "load_imm", (context, ri, vx) => {
  return ok([IxMod.reg(ri, vx)]);
});

const load_u8 = create1Reg1IMMIx(60 as u8, "load_u8", (context, ri, vx) => {
  if (!context.execution.memory.canRead(vx, 1)) {
    return err(new MemoryUnreadable(Number(vx) as u32, 1));
  }

  return ok([
    IxMod.reg(ri, context.execution.memory.getBytes(vx, 1)[0] as number as u32),
  ]);
});

const load_u16 = create1Reg1IMMIx(76 as u8, "load_u16", (context, ri, vx) => {
  if (!context.execution.memory.canRead(vx, 2)) {
    return err(new MemoryUnreadable(Number(vx) as u32, 2));
  }
  return ok([
    IxMod.reg(
      ri,
      Number(E_2.decode(context.execution.memory.getBytes(vx, 2)).value) as u32,
    ),
  ]);
});

const load_u32 = create1Reg1IMMIx(10 as u8, "load_u32", (context, ri, vx) => {
  if (!context.execution.memory.canRead(vx, 4)) {
    return err(new MemoryUnreadable(Number(vx) as u32, 4));
  }
  return ok([
    IxMod.reg(
      ri,
      Number(E_4.decode(context.execution.memory.getBytes(vx, 4)).value) as u32,
    ),
  ]);
});

// ### Load signed
const load_i8 = create1Reg1IMMIx(74 as u8, "load_i8", (context, ri, vx) => {
  if (!context.execution.memory.canRead(vx, 1)) {
    return err(new MemoryUnreadable(Number(vx) as u32, 1));
  }

  return ok([
    IxMod.reg(
      ri,
      Z4_inv(Z(1, BigInt(context.execution.memory.getBytes(vx, 1)[0]))),
    ),
  ]);
});
const load_i16 = create1Reg1IMMIx(66 as u8, "load_i16", (context, ri, vx) => {
  if (!context.execution.memory.canRead(vx, 2)) {
    return err(new MemoryUnreadable(Number(vx) as u32, 2));
  }

  return ok([
    IxMod.reg(
      ri,
      Z4_inv(Z(2, E_2.decode(context.execution.memory.getBytes(vx, 2)).value)),
    ),
  ]);
});

// ### Store

const store_u8 = create1Reg1IMMIx(71 as u8, "store_u8", (context, ri, vx) => {
  return ok([
    IxMod.memory(
      vx,
      new Uint8Array([Number(context.execution.registers[ri] % 256n)]),
    ),
  ]);
});

const store_u16 = create1Reg1IMMIx(69 as u8, "store_u16", (context, ri, vx) => {
  const wa = Number(context.execution.registers[ri] % 2n ** 16n) as u16;
  const tmp = new Uint8Array(2);
  E_2.encode(BigInt(wa), tmp);
  return ok([IxMod.memory(vx, tmp)]);
});
const store_u32 = create1Reg1IMMIx(22 as u8, "store_u32", (context, ri, vx) => {
  const wa = Number(context.execution.registers[ri] % 2n ** 32n) as u32;
  const tmp = new Uint8Array(4);
  E_4.encode(BigInt(wa), tmp);
  return ok([IxMod.memory(vx, tmp)]);
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  type Mock = import("@vitest/spy").Mock;
  const { createEvContext } = await import("@/test/mocks.js");
  const { runTestIx } = await import("@/test/mocks.js");
  describe("one_reg_one_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if no input bytes", () => {
        expect(() => decode(new Uint8Array([]))).toThrow("no input bytes");
      });
      it("it should get vx 0 if only 1 byte", () => {
        const [rA, vX] = decode(new Uint8Array([1]))._unsafeUnwrap();
        expect(rA).toBe(1);
        expect(vX).toBe(0n);
      });
      it("should mod 16 for rA", () => {
        const [rA] = decode(new Uint8Array([16]))._unsafeUnwrap();
        expect(rA).toBe(0);
      });
      it("should varint properly", () => {
        const [, vX] = decode(new Uint8Array([1, 0b00000001]))._unsafeUnwrap();
        expect(vX).toBe(0b00000000_00000000_00000000_00000001n);
      });
      it("should ignore extra bytes", () => {
        const [, vX] = decode(
          new Uint8Array([
            1, 0b00000001, 0b00000010, 0b00000010, 0b00000010, 1,
          ]),
        )._unsafeUnwrap();
        expect(vX).toBe(0b00000010_00000010_00000010_00000001n);
      });
    });
    describe("ixs", () => {
      it.skip("jump_ind", () => {});
      it("load_imm", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          load_imm,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(0x1234n);
      });
      it("load_u8", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValueOnce(true);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([
          0xaaaa,
        ]);
        const { p_context } = runTestIx(
          context,
          load_u8,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(0xaaaan);
      });
      it("load_u16", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValueOnce(true);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        const { p_context } = runTestIx(
          context,
          load_u16,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(0x1234n);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234n,
          2,
        ]);
      });
      it("load_u32", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValue(true);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12, 0x00, 0x01]),
        );
        const { p_context } = runTestIx(
          context,
          load_u32,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(0x01001234n);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234n,
          4,
        ]);
      });
      it("load_i8", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValue(true);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([127]);
        let { p_context } = runTestIx(
          context,
          load_i8,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(127n);
        // test negative
        (p_context.memory.getBytes as Mock).mockReturnValueOnce([
          Z_inv(1, -2n),
        ]);

        p_context = runTestIx(
          context,
          load_i8,
          1 as RegisterIdentifier,
          0x1234n as u64,
        ).p_context;
        expect(Z4(p_context.registers[1])).toBe(-2);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(2);
      });
      it("load_i16", () => {
        const context = createEvContext();
        (context.execution.memory.canRead as Mock).mockReturnValue(true);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        const { p_context } = runTestIx(
          context,
          load_i16,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect(p_context.registers[1]).toBe(0x1234n);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234n,
          2,
        ]);
        // test negative
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0xff, 0xff]),
        );
        const p_context2 = runTestIx(
          context,
          load_i16,
          1 as RegisterIdentifier,
          0x1234n as u64,
        ).p_context;
        expect(BigInt(Z4(p_context2.registers[1]))).toBe(-1n);
      });
      it("store_u8", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x2211n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_u8,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11]),
        ]);
      });
      it("store_u16", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x332211n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_u16,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22]),
        ]);
      });
      it("store_u32", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x44332211n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(
          context,
          store_u32,
          1 as RegisterIdentifier,
          0x1234n as u64,
        );
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22, 0x33, 0x44]),
        ]);
      });
    });
  });
}
