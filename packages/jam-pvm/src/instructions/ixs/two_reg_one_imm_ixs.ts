import {
  Gas,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { Z, Z4, Z4_inv, Z8, Z8_inv, Z_inv } from "@/utils/zed.js";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { regIx } from "@/instructions/ixdb.js";
import { E_2, E_4, E_8, encodeWithCodec } from "@tsjam/codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { IxMod, X_4, X_8 } from "@/instructions/utils.js";
import { Result, ok } from "neverthrow";

// $(0.5.4 - A.25)
const decode = (
  bytes: Uint8Array,
): Result<[RegisterIdentifier, RegisterIdentifier, bigint], never> => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const imm = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return ok([rA, rB, imm]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vX: bigint]
  >,
) => {
  return regIx<[rA: RegisterIdentifier, rB: RegisterIdentifier, vX: bigint]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

// # store

const store_ind_u8 = create(
  120 as u8,
  "store_ind_u8",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    return ok([
      IxMod.memory(
        location as u32,
        new Uint8Array([Number(context.execution.registers[rA] & 0xffn)]),
      ),
    ]);
  },
);

const store_ind_u16 = create(
  121 as u8,
  "store_ind_u16",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    return ok([
      IxMod.memory(
        location,
        encodeWithCodec(E_2, context.execution.registers[rA] & 0xffffn),
      ),
    ]);
  },
);

const store_ind_u32 = create(
  122 as u8,
  "store_ind_u32",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(context.execution.registers[rA] % 2n ** 32n), tmp);
    return ok([IxMod.memory(location, tmp)]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const store_ind_u64 = create(
  123 as u8,
  "store_ind_u64",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    return ok([
      IxMod.memory(
        location,
        encodeWithCodec(E_8, context.execution.registers[rA]),
      ),
    ]);
  },
);

// # load unsigned
const load_ind_u8 = create(124 as u8, "load_ind_u8", (context, rA, rB, vX) => {
  const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
  return ok([
    IxMod.reg(rA, context.execution.memory.getBytes(location, 1)[0] as u32),
  ]);
});

const load_ind_u16 = create(
  126 as u8,
  "load_ind_u16",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const r = context.execution.memory.getBytes(location, 2);
    return ok([IxMod.reg(rA, E_2.decode(r).value)]);
  },
);

const load_ind_u32 = create(
  128 as u8,
  "load_ind_u32",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const r = context.execution.memory.getBytes(location, 4);
    return ok([IxMod.reg(rA, E_4.decode(r).value)]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const load_ind_u64 = create(
  130 as u8,
  "load_ind_u64",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const r = context.execution.memory.getBytes(location, 8);
    return ok([IxMod.reg(rA, E_8.decode(r).value)]);
  },
);

// # load signed
const load_ind_i8 = create(125 as u8, "load_ind_i8", (context, rA, rB, vX) => {
  const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
  const raw = context.execution.memory.getBytes(location, 1);
  const val = Z8_inv(Z(1, BigInt(raw[0])));
  return ok([IxMod.reg(rA, val)]);
});

const load_ind_i16 = create(
  127 as u8,
  "load_ind_i16",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const val = context.execution.memory.getBytes(location, 2);
    const num = E_2.decode(val).value;
    return ok([IxMod.reg(rA, Z8_inv(Z(2, num)))]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const load_ind_i32 = create(
  129 as u8,
  "load_ind_i32",
  (context, rA, rB, vX) => {
    const location = toSafeMemoryAddress(context.execution.registers[rB] + vX);
    const val = context.execution.memory.getBytes(location, 4);
    const num = E_4.decode(val).value;
    return ok([IxMod.reg(rA, Z8_inv(Z(4, num)))]);
  },
);

// math
const add_imm_32 = create(131 as u8, "add_imm_32", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, X_4((context.execution.registers[rB] + vX) % 2n ** 32n)),
  ]);
});

const and_imm = create(132 as u8, "and_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, context.execution.registers[rB] & BigInt(vX))]);
});

const xor_imm = create(133 as u8, "xor_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, context.execution.registers[rB] ^ BigInt(vX))]);
});

const or_imm = create(134 as u8, "or_imm", (context, rA, rB, vX) => {
  return ok([IxMod.reg(rA, context.execution.registers[rB] | BigInt(vX))]);
});

const mul_imm_32 = create(135 as u8, "mul_imm_32", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] * BigInt(vX)) % 2n ** 32n),
  ]);
});

const set_lt_u_imm = create(
  136 as u8,
  "set_lt_u_imm",
  (context, rA, rB, vX) => {
    return ok([IxMod.reg(rA, context.execution.registers[rB] < vX ? 1 : 0)]);
  },
);

const set_lt_s_imm = create(
  137 as u8,
  "set_lt_s_imm",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Z8(context.execution.registers[rB]) < Z8(BigInt(vX)) ? 1 : 0,
      ),
    ]);
  },
);

const shlo_l_imm_32 = create(
  138 as u8,
  "shlo_l_imm_32",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        X_4((context.execution.registers[rB] << vX % 32n) % 2n ** 32n),
      ),
    ]);
  },
);

const shlo_r_imm_32 = create(
  139 as u8,
  "shlo_r_imm_32",
  (context, rA, rB, vX) => {
    const wb = Number(context.execution.registers[rB] % 2n ** 32n);
    return ok([IxMod.reg(rA, X_4(BigInt(wb >>> Number(vX % 32n))))]);
  },
);

const shar_r_imm_32 = create(
  140 as u8,
  "shar_r_imm_32",
  (context, rA, rB, vX) => {
    const wb = Number(context.execution.registers[rB] % 2n ** 32n);
    return ok([IxMod.reg(rA, Z8_inv(BigInt(Z4(wb) >> Number(vX % 32n))))]);
  },
);

const neg_add_imm_32 = create(
  141 as u8,
  "neg_add_imm_32",
  (context, rA, rB, vX) => {
    let val = (vX + 2n ** 32n - context.execution.registers[rB]) % 2n ** 32n;
    if (val < 0n) {
      // other languages behave differently than js when modulo a negative number
      // see comment 3 on pull 3 of jamtestvector.
      val += 2n ** 32n;
    }
    return ok([IxMod.reg(rA, X_4(val))]);
  },
);

const set_gt_u_imm = create(
  142 as u8,
  "set_gt_u_imm",
  (context, rA, rB, vX) => {
    return ok([IxMod.reg(rA, context.execution.registers[rB] > vX ? 1 : 0)]);
  },
);

const set_gt_s_imm = create(
  143 as u8,
  "set_gt_s_imm",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Z8(context.execution.registers[rB]) > Z8(BigInt(vX)) ? 1 : 0,
      ),
    ]);
  },
);

const shlo_l_imm_alt_32 = create(
  144 as u8,
  "shlo_l_imm_alt_32",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        X_4((vX << context.execution.registers[rB] % 32n) % 2n ** 32n),
      ),
    ]);
  },
);

const shlo_r_imm_alt_32 = create(
  145 as u8,
  "shlo_r_imm_alt_32",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        (Number(vX) >>> Number(context.execution.registers[rB] % 32n)) as u32,
      ),
    ]);
  },
);

const shar_r_imm_alt_32 = create(
  146 as u8,
  "shar_r_imm_alt_32",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Z8_inv(
          BigInt(Z4(vX % 2n ** 32n)) >> context.execution.registers[rB] % 32n,
        ),
      ),
    ]);
  },
);

const cmov_iz_imm = create(147 as u8, "cmov_iz_imm", (context, rA, rB, vX) => {
  if (context.execution.registers[rB] === 0n) {
    return ok([IxMod.reg(rA, vX)]);
  }

  return ok([]);
});

const cmov_nz_imm = create(148 as u8, "cmov_nz_imm", (context, rA, rB, vX) => {
  if (context.execution.registers[rB] !== 0n) {
    return ok([IxMod.reg(rA, vX)]);
  }
  return ok([]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const add_imm_64 = create(149 as u8, "add_imm_64", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] + BigInt(vX)) % 2n ** 64n),
  ]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mul_imm_64 = create(150 as u8, "mul_imm_64", (context, rA, rB, vX) => {
  return ok([
    IxMod.reg(rA, (context.execution.registers[rB] * BigInt(vX)) % 2n ** 64n),
  ]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_l_imm_64 = create(
  151 as u8,
  "shlo_l_imm_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        X_8((context.execution.registers[rB] << BigInt(vX % 64n)) % 2n ** 64n),
      ),
    ]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_r_imm_64 = create(
  152 as u8,
  "shlo_r_imm_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        X_8(context.execution.registers[rB] / 2n ** (BigInt(vX) % 64n)),
      ),
    ]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shar_r_imm_64 = create(
  153 as u8,
  "shar_r_imm_64",
  (context, rA, rB, vX) => {
    const z8b = Z8(context.execution.registers[rB]);
    const dividend = 2n ** (BigInt(vX) % 64n);
    let result = z8b / dividend;
    // Math.floor for negative numbers
    if (z8b < 0n && dividend > 0n && z8b % dividend !== 0n) {
      result -= 1n;
    }
    return ok([IxMod.reg(rA, Z8_inv(result))]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const neg_add_imm_64 = create(
  154 as u8,
  "neg_add_imm_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        (BigInt(vX) + 2n ** 64n - context.execution.registers[rB]) % 2n ** 64n,
      ),
    ]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_l_imm_alt_64 = create(
  155 as u8,
  "shlo_l_imm_alt_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        (BigInt(vX) << context.execution.registers[rB] % 64n) % 2n ** 64n,
      ),
    ]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_r_imm_alt_64 = create(
  156 as u8,
  "shlo_r_imm_alt_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        (BigInt(vX) / 2n ** (context.execution.registers[rB] % 64n)) %
          2n ** 64n,
      ),
    ]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shar_r_imm_alt_64 = create(
  157 as u8,
  "shar_r_imm_alt_64",
  (context, rA, rB, vX) => {
    return ok([
      IxMod.reg(
        rA,
        Z8_inv(Z8(BigInt(vX)) >> context.execution.registers[rB] % 64n),
      ),
    ]);
  },
);

const rot_r_64_imm = create(
  158 as u8,
  "rot_r_64_imm",
  (context, rA, rB, vX) => {
    const shift = vX % 64n;
    const mask = 2n ** 64n - 1n;
    const value = context.execution.registers[rB];
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return ok([IxMod.reg(rA, result)]);
  },
);

const rot_r_64_imm_alt = create(
  159 as u8,
  "rot_r_64_imm_alt",
  (context, rA, rB, vX) => {
    const shift = context.execution.registers[rB] % 64n;
    const mask = 2n ** 64n - 1n;
    const value = vX;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return ok([IxMod.reg(rA, result)]);
  },
);

const rot_r_32_imm = create(
  160 as u8,
  "rot_r_32_imm",
  (context, rA, rB, vX) => {
    const shift = vX % 32n;
    const mask = 2n ** 32n - 1n;
    const value = context.execution.registers[rB] % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return ok([IxMod.reg(rA, X_4(result))]);
  },
);

const rot_r_32_imm_alt = create(
  161 as u8,
  "rot_r_32_imm_alt",
  (context, rA, rB, vX) => {
    const shift = context.execution.registers[rB] % 32n;
    const mask = 2n ** 32n - 1n;
    const value = vX % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return ok([IxMod.reg(rA, X_4(result))]);
  },
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  type Mock = import("@vitest/spy").Mock;
  const { runTestIx } = await import("@/test/mocks.js");
  describe("two_reg_one_imm_ixs", () => {
    describe("decode", () => {
      it("should decode the imm with boundaries", () => {
        expect(decode(new Uint8Array([0, 0x11]))).toEqual(
          ok([0, 0, 0x00000011n]),
        );
        expect(decode(new Uint8Array([0, 0x11, 0x22]))).toEqual(
          ok([0, 0, 0x00002211n]),
        );
      });
      it("should decode the imm and allow extra bytes", () => {
        expect(
          decode(new Uint8Array([0, 0x11, 0x22, 0x33, 0x44, 0x55])),
        ).toEqual(ok([0, 0, 0x44332211n]));
      });
    });
    describe("ixs", () => {
      it("store_ind_u8", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x1020n as RegisterValue;
        context.execution.registers[1] = 0x1010n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx, exitReason } = runTestIx(
          context,
          store_ind_u8,
          0,
          1,
          0x01n,
        );
        expect(exitReason).toBeUndefined();
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x20])],
        ]);
      });
      it("store_ind_u16", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x1020n as RegisterValue;
        context.execution.registers[1] = 0x1010n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx, exitReason } = runTestIx(
          context,
          store_ind_u16,
          0,
          1,
          0x01n,
        );
        expect(exitReason).toBeUndefined();
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x20, 0x10])],
        ]);
      });
      it("store_ind_u32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x10203040n as RegisterValue;
        context.execution.registers[1] = 0x1010n as RegisterValue;
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx, exitReason } = runTestIx(
          context,
          store_ind_u32,
          0,
          1,
          0x01n,
        );
        expect(exitReason).toBeUndefined();
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x1011, new Uint8Array([0x40, 0x30, 0x20, 0x10])],
        ]);
      });
      it("load_ind_u8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([0x20]);
        context.execution.registers[0] = 0x1010n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, load_ind_u8, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(0x20n);
        expect((ctx.memory.getBytes as Mock).mock.calls).toEqual([[0x1021, 1]]);
      });
      it("load_ind_u16", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x20, 0x10]),
        );
        context.execution.registers[0] = 0x1010n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, load_ind_u16, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(0x1020n);
        expect((ctx.memory.getBytes as Mock).mock.calls).toEqual([[0x1021, 2]]);
      });
      it("load_ind_u32", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([0x40, 0x30, 0x20, 0x10]),
        );
        context.execution.registers[0] = 0x1010n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, load_ind_u32, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(0x10203040n);
        expect((ctx.memory.getBytes as Mock).mock.calls).toEqual([[0x1021, 4]]);
      });
      it("load_ind_i8", () => {
        const context = createEvContext();
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce([
          Z_inv(1, -1n),
        ]);
        context.execution.registers[0] = 0x1010n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, load_ind_i8, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(BigInt(Z8_inv(-1n)));
        expect((ctx.memory.getBytes as Mock).mock.calls).toEqual([[0x1021, 1]]);
      });
      it("load_ind_i16", () => {
        const context = createEvContext();
        const value = Number(Z_inv(2, -1n));
        (context.execution.memory.getBytes as Mock).mockReturnValueOnce(
          new Uint8Array([value >> 8, value & 0xff]),
        );
        context.execution.registers[0] = 0x1010n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, load_ind_i16, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(BigInt(Z8_inv(-1n)));
        expect((ctx.memory.getBytes as Mock).mock.calls).toEqual([[0x1021, 2]]);
      });
      it("add_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0xffffffffn as RegisterValue;
        const { ctx } = runTestIx(context, add_imm_32, 1, 0, 3n);
        expect(ctx.registers[1]).toBe(2n);
      });
      it("and_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101n as RegisterValue;
        const { ctx } = runTestIx(context, and_imm, 1, 0, 0b110n);
        expect(ctx.registers[1]).toBe(0b100n);
      });
      it("xor_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101n as RegisterValue;
        const { ctx } = runTestIx(context, xor_imm, 1, 0, 0b110n);
        expect(ctx.registers[1]).toBe(0b011n);
      });
      it("or_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0b101n as RegisterValue;
        const { ctx } = runTestIx(context, or_imm, 1, 0, 0b110n);
        expect(ctx.registers[1]).toBe(0b111n);
      });
      it("mul_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = BigInt(2 ** 31) as RegisterValue;
        const { ctx } = runTestIx(context, mul_imm_32, 1, 0, 2n);
        expect(ctx.registers[1]).toBe(0n);

        const { ctx: p_context2 } = runTestIx(context, mul_imm_32, 1, 0, 3n);
        expect(p_context2.registers[1]).toBe(2n ** 31n);
      });
      it("set_lt_u_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x10n as RegisterValue;
        const { ctx } = runTestIx(context, set_lt_u_imm, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(1n);

        context.execution.registers[0] = 0x11n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          set_lt_u_imm,
          1,
          0,
          0x11n,
        );
        expect(p_context2.registers[1]).toBe(0n);
      });
      it.skip("set_lt_s_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = BigInt(Z8_inv(-2n)) as RegisterValue;
        const { ctx } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          BigInt(Z4_inv(-1)),
        );

        expect(ctx.registers[1]).toBe(1n);

        context.execution.registers[0] = BigInt(Z4_inv(-1)) as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          BigInt(Z4_inv(0)),
        );
        expect(p_context2.registers[1]).toBe(1n);

        context.execution.registers[0] = BigInt(Z4_inv(0)) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(
          context,
          set_lt_s_imm,
          1,
          0,
          BigInt(Z4_inv(-1)),
        );
        expect(p_context3.registers[1]).toBe(0n);
      });
      it("set_gt_u_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x11n as RegisterValue;
        const { ctx } = runTestIx(context, set_gt_u_imm, 1, 0, 0x11n);
        expect(ctx.registers[1]).toBe(0n);

        context.execution.registers[0] = 0x12n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          set_gt_u_imm,
          1,
          0,
          0x11n,
        );
        expect(p_context2.registers[1]).toBe(1n);
      });
      it("set_gt_s_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = BigInt(Z4_inv(-1)) as RegisterValue;
        const { ctx } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          BigInt(Z4_inv(-2)),
        );
        expect(ctx.registers[1]).toBe(1n);

        context.execution.registers[0] = BigInt(Z4_inv(-1)) as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          BigInt(Z4_inv(-1)),
        );
        expect(p_context2.registers[1]).toBe(0n);

        context.execution.registers[0] = BigInt(Z4_inv(-2)) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(
          context,
          set_gt_s_imm,
          1,
          0,
          BigInt(Z4_inv(-1)),
        );
        expect(p_context3.registers[1]).toBe(0n);
      });
      it("cmov_iz_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0n as RegisterValue;
        context.execution.registers[1] = 1n as RegisterValue;

        const { ctx } = runTestIx(context, cmov_iz_imm, 0, 1, 0x10n);
        expect(ctx.registers[0]).toBe(0x0n);

        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          cmov_iz_imm,
          0,
          1,
          0x10n,
        );
        expect(p_context2.registers[0]).toBe(0x10n);
      });
      it("cmov_nz_imm", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0n as RegisterValue;
        context.execution.registers[1] = 1n as RegisterValue;
        const { ctx } = runTestIx(context, cmov_nz_imm, 0, 1, 0x10n);
        expect(ctx.registers[0]).toBe(0x10n);

        context.execution.registers[0] = 0n as RegisterValue;
        context.execution.registers[1] = 0n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          cmov_nz_imm,
          0,
          1,
          0x10n,
        );
        expect(p_context2.registers[0]).toBe(0x0n);
      });
      it("neg_add_imm_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 10n as RegisterValue;
        const { ctx } = runTestIx(context, neg_add_imm_32, 1, 0, 11n);
        expect(ctx.registers[1]).toBe(1n);
      });
      it("shlo_l_imm_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = (2n ** 31n) as RegisterValue;
        const { ctx } = runTestIx(context, shlo_l_imm_32, 1, 0, 33n);
        expect(ctx.registers[1]).toBe(0n);

        context.execution.registers[0] = 1n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, shlo_l_imm_32, 1, 0, 1n);
        expect(p_context2.registers[1]).toBe(2n);
      });
      it("shlo_l_imm_alt_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 33n as RegisterValue;
        const { ctx } = runTestIx(context, shlo_l_imm_alt_32, 1, 0, 1n);
        expect(ctx.registers[1]).toBe(2n);

        context.execution.registers[0] = 1n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(
          context,
          shlo_l_imm_alt_32,
          1,
          0,
          2n ** 31n,
        );
        expect(p_context2.registers[1]).toBe(0n);
      });
      it.skip("shlo_r_imm_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0x80000000n as RegisterValue;
        const { ctx } = runTestIx(context, shlo_r_imm_32, 1, 0, 1n);
        expect(ctx.registers[1]).toBe(0x40000000);
      });
      it.skip("shlo_r_imm_alt_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 1n as RegisterValue;
        const { ctx } = runTestIx(
          context,
          shlo_r_imm_alt_32,
          1,
          0,
          0x80000000n,
        );
        expect(ctx.registers[1]).toBe(0x40000000);
      });
      it("shar_r_imm_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = BigInt(
          Z4_inv(-1 * 2 ** 31),
        ) as RegisterValue;
        const { ctx } = runTestIx(context, shar_r_imm_32, 1, 0, 33n);
        expect(ctx.registers[1]).toBe(BigInt(Z8_inv(-1n * 2n ** 30n)));
      });
      it("shar_r_imm_alt_32", () => {
        const context = createEvContext();
        context.execution.registers[0] = 33n as RegisterValue;
        const { ctx } = runTestIx(
          context,
          shar_r_imm_alt_32,
          1,
          0,
          0x80000000n,
        );
        expect(ctx.registers[1]).toBe(BigInt(Z8_inv(-1n * 2n ** 30n)));
      });
    });
  });
}
