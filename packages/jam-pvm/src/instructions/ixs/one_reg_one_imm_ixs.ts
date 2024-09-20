import {
  PVMIxEvaluateFN,
  RegisterIdentifier,
  u16,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { Z, Z4, Z4_inv, Z_inv } from "@/utils/zed.js";
import { djump } from "@/utils/djump.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_2, E_4 } from "@vekexasia/jam-codec";

type InputType = [register: RegisterIdentifier, value: u32];
const decode = (bytes: Uint8Array): InputType => {
  assert(bytes.length > 0, "no input bytes");
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 1));
  const vx = readVarIntFromBuffer(bytes.subarray(1), lx as u8);
  return [ra, vx];
};

const create1Reg1IMMIx = (
  opCode: u8,
  identifier: string,
  evaluate: PVMIxEvaluateFN<InputType>,
  blockTermination?: true,
) => {
  return regIx({
    opCode,
    identifier,
    blockTermination,
    ix: {
      decode,
      evaluate,
      gasCost: 1n,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const jump_ind = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.execution.registers[ri];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;
    return djump(context, jumpLocation);
  },
  true,
);

// ### Load unsigned
const load_imm = create1Reg1IMMIx(4 as u8, "load_imm", (context, ri, vx) => {
  return [{ type: "register", data: { index: ri, value: vx } }];
});

const load_u8 = create1Reg1IMMIx(60 as u8, "load_u8", (context, ri, vx) => {
  return [
    {
      type: "register",
      data: {
        index: ri,
        value: context.execution.memory.getBytes(vx, 1)[0] as number as u32,
      },
    },
  ];
});

const load_u16 = create1Reg1IMMIx(76 as u8, "load_u16", (context, ri, vx) => {
  return [
    {
      type: "register",
      data: {
        index: ri,
        value: Number(
          E_2.decode(context.execution.memory.getBytes(vx, 2)).value,
        ) as u32,
      },
    },
  ];
});

const load_u32 = create1Reg1IMMIx(10 as u8, "load_u32", (context, ri, vx) => {
  return [
    {
      type: "register",
      data: {
        index: ri,
        value: Number(
          E_4.decode(context.execution.memory.getBytes(vx, 4)).value,
        ) as u32,
      },
    },
  ];
});

// ### Load signed
const load_i8 = create1Reg1IMMIx(74 as u8, "load_i8", (context, ri, vx) => {
  return [
    {
      type: "register",
      data: {
        index: ri,
        value: Z4_inv(Z(1, context.execution.memory.getBytes(vx, 1)[0])),
      },
    },
  ];
});
const load_i16 = create1Reg1IMMIx(66 as u8, "load_i16", (context, ri, vx) => {
  return [
    {
      type: "register",
      data: {
        index: ri,
        value: Z4_inv(
          Z(
            2,
            Number(E_2.decode(context.execution.memory.getBytes(vx, 2)).value),
          ),
        ),
      },
    },
  ];
});

// ### Store

const store_u8 = create1Reg1IMMIx(71 as u8, "store_u8", (context, ri, vx) => {
  return [
    {
      type: "memory",
      data: {
        from: vx,
        data: new Uint8Array([context.execution.registers[ri] % 256]),
      },
    },
  ];
});

const store_u16 = create1Reg1IMMIx(69 as u8, "store_u16", (context, ri, vx) => {
  const wa = (context.execution.registers[ri] % 2 ** 16) as u16;
  const tmp = new Uint8Array(2);
  E_2.encode(BigInt(wa), tmp);
  return [
    {
      type: "memory",
      data: {
        from: vx,
        data: tmp,
      },
    },
  ];
});
const store_u32 = create1Reg1IMMIx(22 as u8, "store_u32", (context, ri, vx) => {
  const wa = (context.execution.registers[ri] % 2 ** 32) as u32;
  const tmp = new Uint8Array(4);
  E_4.encode(BigInt(wa), tmp);
  return [
    {
      type: "memory",
      data: {
        from: vx,
        data: tmp,
      },
    },
  ];
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
        const [rA, vX] = decode(new Uint8Array([1]));
        expect(rA).toBe(1);
        expect(vX).toBe(0);
      });
      it("should mod 16 for rA", () => {
        const [rA] = decode(new Uint8Array([16]));
        expect(rA).toBe(0);
      });
      it("should varint properly", () => {
        const [, vX] = decode(new Uint8Array([1, 0b00000001]));
        expect(vX).toBe(0b00000000_00000000_00000000_00000001);
      });
      it("should ignore extra bytes", () => {
        const [, vX] = decode(
          new Uint8Array([
            1, 0b00000001, 0b00000010, 0b00000010, 0b00000010, 1,
          ]),
        );
        expect(vX).toBe(0b00000010_00000010_00000010_00000001);
      });
    });
    describe("ixs", () => {
      it.skip("jump_ind", () => {});
      it("load_imm", () => {
        const context = createEvContext();
        const { p_context } = runTestIx(context, load_imm, 1, 0x1234);
        expect(p_context.registers[1]).toBe(0x1234);
      });
      it("load_u8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([
          0xaaaa,
        ]);
        const { p_context } = runTestIx(context, load_u8, 1, 0x1234);
        expect(p_context.registers[1]).toBe(0xaaaa);
      });
      it("load_u16", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        const { p_context } = runTestIx(context, load_u16, 1, 0x1234);
        expect(p_context.registers[1]).toBe(0x1234);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 2,
        ]);
      });
      it("load_u32", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12, 0x00, 0x01]),
        );
        const { p_context } = runTestIx(context, load_u32, 1, 0x1234);
        expect(p_context.registers[1]).toBe(0x01001234);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 4,
        ]);
      });
      it("load_i8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([127]);
        let { p_context } = runTestIx(context, load_i8, 1, 0x1234);
        expect(p_context.registers[1]).toBe(127);
        // test negative
        (p_context.memory.getBytes as Mock).mockReturnValueOnce([Z_inv(1, -2)]);

        p_context = runTestIx(context, load_i8, 1, 0x1234).p_context;
        expect(Z4(p_context.registers[1])).toBe(-2);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(2);
      });
      it("load_i16", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        const { p_context } = runTestIx(context, load_i16, 1, 0x1234);
        expect(p_context.registers[1]).toBe(0x1234);
        expect((p_context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 2,
        ]);
        // test negative
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0xff, 0xff]),
        );
        const p_context2 = runTestIx(context, load_i16, 1, 0x1234).p_context;
        expect(Z4(p_context2.registers[1])).toBe(-1);
      });
      it("store_u8", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x2211 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(context, store_u8, 1, 0x1234);
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11]),
        ]);
      });
      it("store_u16", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x332211 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(context, store_u16, 1, 0x1234);
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22]),
        ]);
      });
      it("store_u32", () => {
        const context = createEvContext();
        context.execution.registers[1] = 0x44332211 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context } = runTestIx(context, store_u32, 1, 0x1234);
        expect((p_context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((p_context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22, 0x33, 0x44]),
        ]);
      });
    });
  });
}
