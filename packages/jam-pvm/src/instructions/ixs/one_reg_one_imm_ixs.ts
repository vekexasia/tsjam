import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { u16, u32, u8 } from "@vekexasia/jam-types";
import { RegisterIdentifier } from "@/types.js";
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
  evaluate: EvaluateFunction<InputType>,
  blockTermination?: true,
) => {
  return regIx({
    opCode,
    identifier,
    blockTermination,
    ix: {
      decode,
      evaluate,
    },
  });
};

const jump_ind = create1Reg1IMMIx(
  19 as u8,
  "jump_ind",
  (context, ri, vx) => {
    const wa = context.registers[ri];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;
    return djump(context, jumpLocation);
  },
  true,
);

// ### Load unsigned
const load_imm = create1Reg1IMMIx(4 as u8, "load_imm", (context, ri, vx) => {
  context.registers[ri] = vx;
});

const load_u8 = create1Reg1IMMIx(60 as u8, "load_u8", (context, ri, vx) => {
  context.registers[ri] = context.memory.get(vx) as number as u32;
});

const load_u16 = create1Reg1IMMIx(76 as u8, "load_u16", (context, ri, vx) => {
  context.registers[ri] = Number(
    E_2.decode(context.memory.getBytes(vx, 2)).value,
  ) as u32;
});

const load_u32 = create1Reg1IMMIx(10 as u8, "load_u32", (context, ri, vx) => {
  context.registers[ri] = Number(
    E_4.decode(context.memory.getBytes(vx, 4)).value,
  ) as u32;
});

// ### Load signed
const load_i8 = create1Reg1IMMIx(74 as u8, "load_i8", (context, ri, vx) => {
  context.registers[ri] = Z4_inv(Z(1, context.memory.get(vx)));
});
const load_i16 = create1Reg1IMMIx(66 as u8, "load_i16", (context, ri, vx) => {
  context.registers[ri] = Z4_inv(
    Z(2, Number(E_2.decode(context.memory.getBytes(vx, 2)).value)),
  );
});

// ### Store

const store_u8 = create1Reg1IMMIx(71 as u8, "store_u8", (context, ri, vx) => {
  const wa = (context.registers[ri] % 256) as u8;
  context.memory.set(vx, wa);
});
const store_u16 = create1Reg1IMMIx(69 as u8, "store_u16", (context, ri, vx) => {
  const wa = (context.registers[ri] % 2 ** 16) as u16;
  const tmp = new Uint8Array(2);
  E_2.encode(BigInt(wa), tmp);
  context.memory.setBytes(vx, tmp);
});
const store_u32 = create1Reg1IMMIx(22 as u8, "store_u32", (context, ri, vx) => {
  const wa = (context.registers[ri] % 2 ** 32) as u32;
  const tmp = new Uint8Array(4);
  E_4.encode(BigInt(wa), tmp);
  context.memory.setBytes(vx, tmp);
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  type Mock = import("@vitest/spy").Mock;
  const { createEvContext } = await import("@/test/mocks.js");
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
        expect(vX).toBe(0b00000001_00000000_00000000_00000000);
      });
      it("should ignore extra bytes", () => {
        const [, vX] = decode(
          new Uint8Array([
            1, 0b00000001, 0b00000010, 0b00000010, 0b00000010, 1,
          ]),
        );
        expect(vX).toBe(0b00000001_00000010_00000010_00000010);
      });
    });
    describe("ixs", () => {
      it.skip("jump_ind", () => {});
      it("load_imm", () => {
        const context = createEvContext();
        load_imm.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(0x1234);
      });
      it("load_u8", () => {
        const context = createEvContext();
        (context.memory.get as Mock).mockReturnValueOnce(0xaaaa);
        load_u8.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(0xaaaa);
      });
      it("load_u16", () => {
        const context = createEvContext();
        (context.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        load_u16.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(0x1234);
        expect((context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 2,
        ]);
      });
      it("load_u32", () => {
        const context = createEvContext();
        (context.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12, 0x00, 0x01]),
        );
        load_u32.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(0x01001234);
        expect((context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 4,
        ]);
      });
      it("load_i8", () => {
        const context = createEvContext();
        (context.memory.get as Mock).mockReturnValueOnce(127);
        load_i8.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(127);
        // test negative
        (context.memory.get as Mock).mockReturnValueOnce(Z_inv(1, -2));
        load_i8.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(Z4(context.registers[1])).toBe(-2);

        expect((context.memory.get as Mock).mock.calls).toHaveLength(2);
      });
      it("load_i16", () => {
        const context = createEvContext();
        (context.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x34, 0x12]),
        );
        load_i16.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(context.registers[1]).toBe(0x1234);
        expect((context.memory.getBytes as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.getBytes as Mock).mock.calls[0]).toEqual([
          0x1234, 2,
        ]);
        // test negative
        (context.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0xff, 0xff]),
        );
        load_i16.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect(Z4(context.registers[1])).toBe(-1);
      });
      it("store_u8", () => {
        const context = createEvContext();
        context.registers[1] = 0x2211 as u32;
        store_u8.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect((context.memory.set as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.set as Mock).mock.calls[0]).toEqual([
          0x1234, 0x11,
        ]);
      });
      it("store_u16", () => {
        const context = createEvContext();
        context.registers[1] = 0x332211 as u32;
        store_u16.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect((context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22]),
        ]);
      });
      it("store_u32", () => {
        const context = createEvContext();
        context.registers[1] = 0x44332211 as u32;
        store_u32.evaluate(context, 1 as RegisterIdentifier, 0x1234 as u32);
        expect((context.memory.setBytes as Mock).mock.calls).toHaveLength(1);
        expect((context.memory.setBytes as Mock).mock.calls[0]).toEqual([
          0x1234,
          new Uint8Array([0x11, 0x22, 0x33, 0x44]),
        ]);
      });
    });
  });
}
