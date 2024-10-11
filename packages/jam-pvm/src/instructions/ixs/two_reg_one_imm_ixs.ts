import { PVMIxEvaluateFN, RegisterIdentifier, u32, u8 } from "@tsjam/types";
import { Z, Z4, Z4_inv, Z_inv } from "@/utils/zed.js";
import { regIx } from "@/instructions/ixdb.js";
import { E_2, E_4 } from "@tsjam/codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { IxMod } from "@/instructions/utils.js";
import { Result, ok } from "neverthrow";

const decode = (
  bytes: Uint8Array,
): Result<[RegisterIdentifier, RegisterIdentifier, u32], never> => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const imm = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return ok([rA, rB, Number(imm) as u32]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vX: u32]
  >,
) => {
  return regIx<[rA: RegisterIdentifier, rB: RegisterIdentifier, vX: u32]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n,
    },
  });
};

// # store

const store_ind_u8 = create(16 as u8, "store_ind_u8", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  return ok([
    IxMod.memory(
      location as u32,
      new Uint8Array([context.execution.registers[rA] & 0xff]),
    ),
  ]);
});

const store_ind_u16 = create(
  29 as u8,
  "store_ind_u16",
  (context, rA, rB, vX) => {
    const location = context.execution.registers[rB] + vX;
    const tmp = new Uint8Array(2);
    E_2.encode(BigInt(context.execution.registers[rA] & 0xffff), tmp);
    return ok([IxMod.memory(location, tmp)]);
  },
);

const store_ind_u32 = create(
  3 as u8,
  "store_ind_u32",
  (context, rA, rB, vX) => {
    const location = context.execution.registers[rB] + vX;
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(context.execution.registers[rA]), tmp);
    return ok([IxMod.memory(location, tmp)]);
  },
);

// # load unsigned
const load_ind_u8 = create(11 as u8, "load_ind_u8", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  return ok([
    IxMod.reg(rA, context.execution.memory.getBytes(location, 1)[0] as u32),
  ]);
});

const load_ind_u16 = create(37 as u8, "load_ind_u16", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  const r = context.execution.memory.getBytes(location, 2);
  return ok([IxMod.reg(rA, Number(E_2.decode(r).value))]);
});

const load_ind_u32 = create(1 as u8, "load_ind_u32", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  const r = context.execution.memory.getBytes(location, 4);
  return ok([IxMod.reg(rA, Number(E_4.decode(r).value) as u32)]);
});

// # load signed
const load_ind_i8 = create(21 as u8, "load_ind_i8", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  const val = context.execution.memory.getBytes(location, 1);
  return ok([IxMod.reg(rA, Z4_inv(Z(1, val[0])))]);
});

const load_ind_i16 = create(33 as u8, "load_ind_i16", (context, rA, rB, vX) => {
  const location = context.execution.registers[rB] + vX;
  const val = context.execution.memory.getBytes(location, 2);
  const num = Number(E_2.decode(val).value);
  return ok([IxMod.reg(rA, Z4_inv(Z(2, num)))]);
});

// math
const add_imm = create(2 as u8, "add_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, ((context.execution.registers[rB] + vX) % 2 ** 32) as u32),
  ]);
});

const and_imm = create(18 as u8, "and_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, (context.execution.registers[rB] & vX) as u32)]);
});

const xor_imm = create(31 as u8, "xor_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, (context.execution.registers[rB] ^ vX) as u32)]);
});

const or_imm = create(49 as u8, "or_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, (context.execution.registers[rB] | vX) as u32)]);
});

const mul_imm = create(35 as u8, "mul_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, ((context.execution.registers[rB] * vX) % 2 ** 32) as u32),
  ]);
});

const mul_upper_s_s_imm = create(
  65 as u8,
  "mul_upper_s_s_imm",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Z4_inv(
          Math.floor((Z4(context.execution.registers[rB]) * Z4(vX)) / 2 ** 32),
        ) as u32,
      ),
    ]);
  },
);

const mul_upper_u_u_imm = create(
  63 as u8,
  "mul_upper_u_u_imm",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Math.floor((context.execution.registers[rB] * vX) / 2 ** 32) as u32,
      ),
    ]);
  },
);

const neg_add_imm = create(40 as u8, "neg_add_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(
      rA,
      ((vX + 2 ** 32 - context.execution.registers[rB]) % 2 ** 32) as u32,
    ),
  ]);
});

// # bitshifts
const shlo_l_imm = create(9 as u8, "shlo_l_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(
      rA,
      ((context.execution.registers[rB] << vX % 32) % 2 ** 32) as u32,
    ),
  ]);
});

const shlo_l_imm_alt = create(
  75 as u8,
  "shlo_l_imm_alt",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        ((vX << context.execution.registers[rB] % 32) % 2 ** 32) as u32,
      ),
    ]);
  },
);

const shlo_r_imm = create(14 as u8, "shlo_r_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] >>> vX % 32) as u32),
  ]);
});

const shlo_r_imm_alt = create(
  72 as u8,
  "shlo_r_imm_alt",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(rA, (vX >>> context.execution.registers[rB] % 32) as u32),
    ]);
  },
);

const shar_r_imm = create(25 as u8, "shar_r_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, Z4_inv(Z4(context.execution.registers[rB]) >> vX % 32)),
  ]);
});

const shar_r_imm_alt = create(
  80 as u8,
  "shar_r_imm_alt",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(rA, Z4_inv(Z4(vX) >> context.execution.registers[rB] % 32)),
    ]);
  },
);

// # sets
const set_lt_u_imm = create(27 as u8, "set_lt_u_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] < vX ? 1 : 0) as u32),
  ]);
});

const set_lt_s_imm = create(56 as u8, "set_lt_s_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(
      rA,
      (Z4(context.execution.registers[rB]) < Z(4, vX) ? 1 : 0) as u32,
    ),
  ]);
});

const set_gt_u_imm = create(39 as u8, "set_gt_u_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] > vX ? 1 : 0) as u32),
  ]);
});

const set_gt_s_imm = create(61 as u8, "set_gt_s_imm", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(
      rA,
      (Z4(context.execution.registers[rB]) > Z(4, vX) ? 1 : 0) as u32,
    ),
  ]);
});

const cmov_iz_imm = create(85 as u8, "cmov_iz_imm", (context, rA, rB, vX) => {
  if (context.execution.registers[rB] === 0) {
    return ok([IxMod.reg(rA, vX)]);
  }

  return ok([]);
});

const cmov_nz_imm = create(86 as u8, "cmov_nz_imm", (context, rA, rB, vX) => {
  if (context.execution.registers[rB] !== 0) {
    return ok([IxMod.reg(rA, vX)]);
  }
  return ok([]);
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  type Mock = import("@vitest/spy").Mock;
  const { runTestIx } = await import("@/test/mocks.js");
  describe("two_reg_one_imm_ixs", () => {
    describe("decode", () => {
      it("should decode valid params", () => {
        expect(decode(new Uint8Array([0]))).toEqual(ok([0, 0, 0]));
        expect(decode(new Uint8Array([15]))).toEqual(ok([12, 0, 0]));
        expect(decode(new Uint8Array([15 + 16]))).toEqual(ok([12, 1, 0]));
        expect(decode(new Uint8Array([16 * 15]))).toEqual(ok([0, 12, 0]));
      });
      it("should decode the imm with boundaries", () => {
        expect(decode(new Uint8Array([0, 0x11]))).toEqual(
          ok([0, 0, 0x00000011]),
        );
        expect(decode(new Uint8Array([0, 0x11, 0x22]))).toEqual(
          ok([0, 0, 0x00002211]),
        );
      });
      it("should decode the imm and allow extra bytes", () => {
        expect(
          decode(new Uint8Array([0, 0x11, 0x22, 0x33, 0x44, 0x55])),
        ).toEqual(ok([0, 0, 0x44332211]));
      });
    });
    describe("ixs", () => {
      it("store_ind_u8", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x1020 as u32;
        context.execution.registers[1] = 0x1010 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context, exitReason } = runTestIx(
          context,
          store_ind_u8,
          0,
          1,
          0x01 as u32,
        );
        expect(exitReason).toBeUndefined();
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x20])],
        ]);
      });
      it("store_ind_u16", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x1020 as u32;
        context.execution.registers[1] = 0x1010 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context, exitReason } = runTestIx(
          context,
          store_ind_u16,
          0,
          1,
          0x01 as u32,
        );
        expect(exitReason).toBeUndefined();
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x20, 0x10])],
        ]);
      });
      it("store_ind_u32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x10203040 as u32;
        context.execution.registers[1] = 0x1010 as u32;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { p_context, exitReason } = runTestIx(
          context,
          store_ind_u32,
          0,
          1,
          0x01 as u32,
        );
        expect(exitReason).toBeUndefined();
        expect((p_context.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x40, 0x30, 0x20, 0x10])],
        ]);
      });
      it("load_ind_u8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([0x20]);
        context.execution.registers[0] = 0x1010 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context } = runTestIx(
          context,
          load_ind_u8,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(0x20);
        expect((p_context.memory.getBytes as Mock).mock.calls).toEqual([
          [0x1021, 1],
        ]);
      });
      it("load_ind_u16", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x20, 0x10]),
        );
        context.execution.registers[0] = 0x1010 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context } = runTestIx(
          context,
          load_ind_u16,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(0x1020);
        expect((p_context.memory.getBytes as Mock).mock.calls).toEqual([
          [0x1021, 2],
        ]);
      });
      it("load_ind_u32", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x40, 0x30, 0x20, 0x10]),
        );
        context.execution.registers[0] = 0x1010 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context } = runTestIx(
          context,
          load_ind_u32,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(0x10203040);
        expect((p_context.memory.getBytes as Mock).mock.calls).toEqual([
          [0x1021, 4],
        ]);
      });
      it("load_ind_i8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([
          Z_inv(1, -1),
        ]);
        context.execution.registers[0] = 0x1010 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context } = runTestIx(
          context,
          load_ind_i8,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(Z4_inv(-1));
        expect((p_context.memory.getBytes as Mock).mock.calls).toEqual([
          [0x1021, 1],
        ]);
      });
      it("load_ind_i16", () => {
        const context = createEvContext();
        const value = Z_inv(2, -1);
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([value >> 8, value & 0xff]),
        );
        context.execution.registers[0] = 0x1010 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context } = runTestIx(
          context,
          load_ind_i16,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(Z4_inv(-1));
        expect((p_context.memory.getBytes as Mock).mock.calls).toEqual([
          [0x1021, 2],
        ]);
      });
      it("add_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0xffffffff as u32;
        const { p_context } = runTestIx(context, add_imm, 1, 0, 3 as u32);
        expect(p_context.registers[1]).toBe(2);
      });
      it("and_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101 as u32;
        const { p_context } = runTestIx(context, and_imm, 1, 0, 0b110 as u32);
        expect(p_context.registers[1]).toBe(0b100);
      });
      it("xor_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101 as u32;
        const { p_context } = runTestIx(context, xor_imm, 1, 0, 0b110 as u32);
        expect(p_context.registers[1]).toBe(0b011);
      });
      it("or_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101 as u32;
        const { p_context } = runTestIx(context, or_imm, 1, 0, 0b110 as u32);
        expect(p_context.registers[1]).toBe(0b111);
      });
      it("mul_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = (2 ** 31) as u32;
        const { p_context } = runTestIx(context, mul_imm, 1, 0, 2 as u32);
        expect(p_context.registers[1]).toBe(0);

        const { p_context: p_context2 } = runTestIx(
          context,
          mul_imm,
          1,
          0,
          3 as u32,
        );
        expect(p_context2.registers[1]).toBe(2 ** 31);
      });
      it("mul_upper_s_s_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = Z4_inv(2 ** 30);
        const { p_context } = runTestIx(
          context,
          mul_upper_s_s_imm,
          1,
          0,
          Z4_inv(8),
        );
        expect(p_context.registers[1]).toBe(Z4_inv(2));

        context.execution.registers[0] = Z4_inv(2 ** 30);

        const { p_context: p_context2 } = runTestIx(
          context,
          mul_upper_s_s_imm,
          1,
          0,
          Z4_inv(-16),
        );
        expect(p_context2.registers[1]).toBe(Z4_inv(-4));
      });
      it("mul_upper_u_u_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = (2 ** 30) as u32;
        const { p_context } = runTestIx(
          context,
          mul_upper_u_u_imm,
          1,
          0,
          8 as u32,
        );
        expect(p_context.registers[1]).toBe(2);
      });
      it("set_lt_u_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x10 as u32;
        const { p_context } = runTestIx(
          context,
          set_lt_u_imm,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(1);

        context.execution.registers[0] = 0x11 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          set_lt_u_imm,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context2.registers[1]).toBe(0);
      });
      it("set_lt_s_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = Z4_inv(-2);
        const { p_context } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          Z4_inv(-1),
        );

        expect(p_context.registers[1]).toBe(1);

        context.execution.registers[0] = Z4_inv(-1);
        const { p_context: p_context2 } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          Z4_inv(0),
        );
        expect(p_context2.registers[1]).toBe(1);

        context.execution.registers[0] = Z4_inv(0);
        const { p_context: p_context3 } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          Z4_inv(-1),
        );
        expect(p_context3.registers[1]).toBe(0);
      });
      it("set_gt_u_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x11 as u32;
        const { p_context } = runTestIx(
          context,
          set_gt_u_imm,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context.registers[1]).toBe(0);

        context.execution.registers[0] = 0x12 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          set_gt_u_imm,
          1,
          0,
          0x11 as u32,
        );
        expect(p_context2.registers[1]).toBe(1);
      });
      it("set_gt_s_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = Z4_inv(-1);
        const { p_context } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          Z4_inv(-2),
        );
        expect(p_context.registers[1]).toBe(1);

        context.execution.registers[0] = Z4_inv(-1);
        const { p_context: p_context2 } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          Z4_inv(-1),
        );
        expect(p_context2.registers[1]).toBe(0);

        context.execution.registers[0] = Z4_inv(-2);
        const { p_context: p_context3 } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          Z4_inv(-1),
        );
        expect(p_context3.registers[1]).toBe(0);
      });
      it("cmov_iz_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0 as u32;
        context.execution.registers[1] = 1 as u32;

        const { p_context } = runTestIx(
          context,
          cmov_iz_imm,
          0,
          1,
          0x10 as u32,
        );
        expect(p_context.registers[0]).toBe(0x0);

        context.execution.registers[1] = 0 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          cmov_iz_imm,
          0,
          1,
          0x10 as u32,
        );
        expect(p_context2.registers[0]).toBe(0x10);
      });
      it("cmov_nz_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0 as u32;
        context.execution.registers[1] = 1 as u32;
        const { p_context } = runTestIx(
          context,
          cmov_nz_imm,
          0,
          1,
          0x10 as u32,
        );
        expect(p_context.registers[0]).toBe(0x10);

        context.execution.registers[0] = 0 as u32;
        context.execution.registers[1] = 0 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          cmov_nz_imm,
          0,
          1,
          0x10 as u32,
        );
        expect(p_context2.registers[0]).toBe(0x0);
      });
      it("neg_add_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 10 as u32;
        const { p_context } = runTestIx(context, neg_add_imm, 1, 0, 11 as u32);
        expect(p_context.registers[1]).toBe(1);
      });
      it("shlo_l_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = (2 ** 31) as u32;
        const { p_context } = runTestIx(context, shlo_l_imm, 1, 0, 33 as u32);
        expect(p_context.registers[1]).toBe(0);

        context.execution.registers[0] = 1 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          shlo_l_imm,
          1,
          0,
          1 as u32,
        );
        expect(p_context2.registers[1]).toBe(2);
      });
      it("shlo_l_imm_alt", () => {
        const context = createEvContext();
        context.execution.registers[0] = 33 as u32;
        const { p_context } = runTestIx(
          context,
          shlo_l_imm_alt,
          1,
          0,
          1 as u32,
        );
        expect(p_context.registers[1]).toBe(2);

        context.execution.registers[0] = 1 as u32;
        const { p_context: p_context2 } = runTestIx(
          context,
          shlo_l_imm_alt,
          1,
          0,
          (2 ** 31) as u32,
        );
        expect(p_context2.registers[1]).toBe(0);
      });
      it("shlo_r_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x80000000 as u32;
        const { p_context } = runTestIx(context, shlo_r_imm, 1, 0, 1 as u32);
        expect(p_context.registers[1]).toBe(0x40000000);
      });
      it("shlo_r_imm_alt", () => {
        const context = createEvContext();
        context.execution.registers[0] = 1 as u32;
        const { p_context } = runTestIx(
          context,
          shlo_r_imm_alt,
          1,
          0,
          0x80000000 as u32,
        );
        expect(p_context.registers[1]).toBe(0x40000000);
      });
      it("shar_r_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = Z4_inv(-1 * 2 ** 31) as u32;
        const { p_context } = runTestIx(context, shar_r_imm, 1, 0, 33 as u32);
        expect(p_context.registers[1]).toBe(Z4_inv(-1 * 2 ** 30));
      });
      it("shar_r_imm_alt", () => {
        const context = createEvContext();
        context.execution.registers[0] = 33 as u32;
        const { p_context } = runTestIx(
          context,
          shar_r_imm_alt,
          1,
          0,
          0x80000000 as u32,
        );
        expect(p_context.registers[1]).toBe(Z4_inv(-1 * 2 ** 30));
      });
    });
  });
}
