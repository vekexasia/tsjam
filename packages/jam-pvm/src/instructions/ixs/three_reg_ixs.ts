import { Result, err, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  SeqOfLength,
  u32,
  u8,
} from "@tsjam/types";
import { Z4, Z4_inv, Z8, Z8_inv } from "@/utils/zed.js";
import { regIx } from "@/instructions/ixdb.js";
import { beforeEach } from "vitest";
import { IxMod } from "@/instructions/utils.js";

type EvaluateType = [
  wA: RegisterValue,
  wB: RegisterValue,
  rD: RegisterIdentifier,
];
type InputType = [RegisterIdentifier, RegisterIdentifier, RegisterIdentifier];

// $(0.5.3 - A.26)
const decode = (bytes: Uint8Array): Result<InputType, PVMIxDecodeError> => {
  if (bytes.length < 2) {
    return err(new PVMIxDecodeError("not enough bytes (2)"));
  }
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return ok([rA, rB, rD]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<EvaluateType>,
) => {
  return regIx<InputType>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate(context, rA, rB, rD) {
        return evaluate(
          context,
          context.execution.registers[rA],
          context.execution.registers[rB],
          rD,
        );
      },
      gasCost: 1n as Gas,
    },
  });
};

const add_32 = create(170 as u8, "add_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + wB) % 2n ** 32n)]);
});

const sub_32 = create(171 as u8, "sub_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + 2n ** 32n - wB) % 2n ** 32n)]);
});

const mul = create(172 as u8, "mul_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA * wB) % 2n ** 32n)]);
});

const div_u_32 = create(173 as u8, "div_u_32", (context, wA, wB, rD) => {
  if (wB % 2n ** 32n === 0n) {
    return ok([IxMod.reg(rD, 2n ** 64n - 1n)]);
  } else {
    return ok([IxMod.reg(rD, wA / wB)]); // NOTE: this was math.floor but bigint division is already trunctaing
  }
});

const div_s_32 = create(174 as u8, "div_s_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  const z4b = Z4(wB);
  let newVal: number | bigint;
  if (wB % 2n ** 32n === 0n) {
    newVal = 2 ** 32 - 1;
  } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
    newVal = wA;
  } else {
    newVal = Z8_inv(BigInt(z4a / z4b));
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const rem_u_32 = create(175 as u8, "rem_u_32", (context, wA, wB, rD) => {
  let newVal: number | bigint;
  if (wB % 2n ** 32n === 0n) {
    newVal = wA;
  } else {
    newVal = (wA % 2n ** 32n) % (wB % 2n ** 32n);
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const rem_s_32 = create(176 as u8, "rem_s_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA % 2n ** 32n);
  const z4b = Z4(wB % 2n ** 32n);
  let newVal: number | bigint;
  if (z4b === 0) {
    newVal = Z8_inv(wA);
  } else if (z4a === -1 * 2 ** 31 && z4b === -1) {
    newVal = 0 as u32;
  } else {
    newVal = Z8_inv(BigInt(z4a % z4b));
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const shlo_l_32 = create(177 as u8, "shlo_l_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA << wB % 32n) % 2n ** 32n)]);
});

const shlo_r_32 = create(178 as u8, "shlo_r_32", (context, wA, wB, rD) => {
  const wa_32 = Number(wA % 2n ** 32n);
  const wb_32 = Number(wB % 2n ** 32n);
  return ok([IxMod.reg(rD, wa_32 >>> wb_32)]);
});

const shar_r_32 = create(179 as u8, "shar_r_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  return ok([IxMod.reg(rD, Z4_inv(z4a / 2 ** Number(wB % 32n)))]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const add_64 = create(180 as u8, "add_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + wB) % 2n ** 64n)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sub_64 = create(181 as u8, "sub_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + 2n ** 64n - wB) % 2n ** 64n)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mul_64 = create(182 as u8, "mul_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA * wB) % 2n ** 64n)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const div_u_64 = create(183 as u8, "div_u_64", (context, wA, wB, rD) => {
  if (wB === 0n) {
    return ok([IxMod.reg(rD, 2 ** 64 - 1)]);
  } else {
    return ok([IxMod.reg(rD, wA / wB)]);
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const div_s_64 = create(184 as u8, "div_s_64", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const z8b = Z8(wB);
  let newVal: number | bigint;
  if (wB === 0n) {
    newVal = 2 ** 32 - 1;
  } else if (z8a == -1n * 2n ** 63n && z8b === -1n) {
    newVal = wA;
  } else {
    newVal = Z8_inv(z8a / z8b);
  }
  return ok([IxMod.reg(rD, newVal)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rem_u_64 = create(185 as u8, "rem_u_64", (context, wA, wB, rD) => {
  let newVal: number | bigint;
  if (wB === 0n) {
    newVal = wA;
  } else {
    newVal = wA % wB;
  }
  return ok([IxMod.reg(rD, newVal)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rem_s_64 = create(186 as u8, "rem_s_64", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const z8b = Z8(wB);
  let newVal: number | bigint;
  if (wB === 0n) {
    newVal = wA;
  } else if (z8a === -1n * 2n ** 63n && z8b === -1n) {
    newVal = 0 as u32;
  } else {
    newVal = Z8_inv(z8a % z8b);
  }
  return ok([IxMod.reg(rD, newVal)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_l_64 = create(187 as u8, "shlo_l_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA << wB % 64n) % 2n ** 64n)]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shlo_r_64 = create(188 as u8, "shlo_r_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA / 2n ** (wB % 64n))]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shar_r_64 = create(189 as u8, "shar_r_64", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  return ok([IxMod.reg(rD, Z8_inv(z8a / 2n ** (wB % 64n)))]);
});

const and = create(190 as u8, "and", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA & wB)]);
});

const xor = create(191 as u8, "xor", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA ^ wB)]);
});

const or = create(192 as u8, "or", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA | wB)]);
});

const mul_upper_s_s = create(
  193 as u8,
  "mul_upper_s_s",
  (context, wA, wB, rD) => {
    return ok([IxMod.reg(rD, Z8_inv((Z8(wA) * Z8(wB)) / 2n ** 64n))]);
  },
);

const mul_upper_u_u = create(
  194 as u8,
  "mul_upper_u_u",
  (context, wA, wB, rD) => {
    return ok([IxMod.reg(rD, (wA * wB) / 2n ** 64n)]);
  },
);

const mul_upper_s_u = create(
  195 as u8,
  "mul_upper_s_u",
  (context, wA, wB, rD) => {
    return ok([IxMod.reg(rD, Z8_inv((Z8(wA) * wB) / 2n ** 64n))]);
  },
);

const set_lt_u = create(196 as u8, "set_lt_u", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA < wB ? 1 : 0)]);
});

const set_lt_s = create(197 as u8, "set_lt_s", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  const z4b = Z4(wB);
  return ok([IxMod.reg(rD, z4a < z4b ? 1 : 0)]);
});

const cmov_iz = create(198 as u8, "cmov_iz", (context, wA, wB, rD) => {
  if (wB === 0n) {
    return ok([IxMod.reg(rD, wA)]);
  }
  return ok([]);
});

const cmov_nz = create(199 as u8, "cmov_nz", (context, wA, wB, rD) => {
  if (wB !== 0n) {
    return ok([IxMod.reg(rD, wA)]);
  }
  return ok([]);
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  const { runTestIx } = await import("@/test/mocks.js");

  describe("three_reg_ixs", () => {
    describe("decoding", () => {
      it("decodes properly", () => {
        const bytes = new Uint8Array([0x10, 0x02]);
        const [rA, rB, rD] = decode(bytes)._unsafeUnwrap();
        expect(rA).toBe(0);
        expect(rB).toBe(1);
        expect(rD).toBe(2);
      });
      it("decodes with rD = 12", () => {
        const bytes = new Uint8Array([0x10, 0xff]);
        const [rA, rB, rD] = decode(bytes)._unsafeUnwrap();
        expect(rA).toBe(0);
        expect(rB).toBe(1);
        expect(rD).toBe(12);
      });
      it("decodes rA = 12", () => {
        const bytes = new Uint8Array([14, 0xff]);
        const [rA] = decode(bytes)._unsafeUnwrap();
        expect(rA).toBe(12);
      });
      it("decodes rB = 12", () => {
        const bytes = new Uint8Array([0xff, 0]);
        const [, rB] = decode(bytes)._unsafeUnwrap();
        expect(rB).toBe(12);
      });
      it("throws when not enough bytes (2)", () => {
        const bytes = new Uint8Array([0x10]);
        expect(decode(bytes)._unsafeUnwrapErr().message).toEqual(
          "not enough bytes (2)",
        );
      });
      it("decodes properly even with extra bytes", () => {
        const bytes = new Uint8Array([0x10, 0x02, 0x03, 0x10, 0x02, 0x03]);
        const [rA, rB, rD] = decode(bytes)._unsafeUnwrap();
        expect(rA).toBe(0);
        expect(rB).toBe(1);
        expect(rD).toBe(2);
      });
    });
    describe("ixs", () => {
      let context = createEvContext();
      const rA = 1 as RegisterIdentifier;
      const rB = 2 as RegisterIdentifier;
      const rD = 3 as RegisterIdentifier;
      beforeEach(() => {
        context = createEvContext();
        context.execution.registers = new Array(13).fill(0n) as SeqOfLength<
          RegisterValue,
          13
        >;
      });
      it("add => rD = (rA + rB)%2^32", () => {
        context.execution.registers[rA] = 1n as RegisterValue;
        context.execution.registers[rB] = 2n as RegisterValue;
        context.execution.registers[rD] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, add_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(3n);

        context.execution.registers[rA] = (2n ** 32n - 1n) as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, add_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(1n);
      });
      it("sub => rD = (rA + 2^32 - rB)%2^32", () => {
        context.execution.registers[rA] = 4n as RegisterValue;
        context.execution.registers[rB] = 2n as RegisterValue;
        const { ctx } = runTestIx(context, sub_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(2n);

        context.execution.registers[rA] = 1n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, sub_32, rA, rB, rD);
        expect(p_context2.registers[3]).toBe(2n ** 32n - 1n);
      });
      it("and => rD = rA & rB", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 0b1100n as RegisterValue;
        const { ctx } = runTestIx(context, and, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b1000n);
      });
      it("xor => rD = rA ^ rB", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 0b1100n as RegisterValue;
        const { ctx } = runTestIx(context, xor, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b0110n);
      });
      it("or => rD = rA | rB", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 0b1100n as RegisterValue;
        const { ctx } = runTestIx(context, or, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b1110n);
      });
      it("mul => rD = (rA * rB)%2^32", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 20n as RegisterValue;
        const { ctx } = runTestIx(context, mul, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(200n);

        context.execution.registers[rA] = (2n ** 31n) as RegisterValue;
        context.execution.registers[rB] = 2n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, mul, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(0n);
      });
      it("mul_upper_s_s => rD = Z4_inv(Z4(rA) * Z(4, rB) / 2^32)", () => {
        context.execution.registers[rA] = (2n ** 62n) as RegisterValue;
        for (let i = 2; i < 30; i++) {
          context.execution.registers[rB] = (2n ** BigInt(i)) as RegisterValue;
          const { ctx } = runTestIx(context, mul_upper_s_s, rA, rB, rD);
          expect(ctx.registers[rD]).toBe(2n ** (BigInt(i) - 2n));
        }
        // - * +
        context.execution.registers[rA] = BigInt(
          Z8_inv(-1n * 2n ** 62n),
        ) as RegisterValue;
        for (let i = 2; i < 30; i++) {
          context.execution.registers[rB] = (2n ** BigInt(i)) as RegisterValue;
          const { ctx } = runTestIx(context, mul_upper_s_s, rA, rB, rD);
          expect(Z8(ctx.registers[rD])).toBe(-1n * 2n ** (BigInt(i) - 2n));
        }

        // - * -
        context.execution.registers[rA] = BigInt(
          Z8_inv(-1n * 2n ** 62n),
        ) as RegisterValue;
        for (let i = 2; i < 30; i++) {
          context.execution.registers[rB] = BigInt(
            Z8_inv(-1n * 2n ** BigInt(i)),
          ) as RegisterValue;
          const { ctx } = runTestIx(context, mul_upper_s_s, rA, rB, rD);
          expect(Z8(ctx.registers[rD])).toBe(2n ** (BigInt(i) - 2n));
        }
      });
      it("mul_upper_u_u => rD = (rA * rB) / 2^64n", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = (2n ** 64n) as RegisterValue;
        const { ctx } = runTestIx(context, mul_upper_u_u, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(10n);
      });
      it("mul_upper_s_u => rD = Z4_inv(Z4(rA) * rB / 2^32)", () => {
        context.execution.registers[rA] = (2n ** 62n) as RegisterValue;
        for (let i = 2; i < 62; i++) {
          context.execution.registers[rB] = (2n ** BigInt(i)) as RegisterValue;
          const { ctx } = runTestIx(context, mul_upper_s_u, rA, rB, rD);
          expect(ctx.registers[rD]).toBe(2n ** (BigInt(i) - 2n));
        }
        // - * +
        /*context.execution.registers[rA] = Z8_inv(-1n * 2n ** 62n);
        for (let i = 2; i < 30; i++) {
          context.execution.registers[rB] = BigInt(2 ** i) as RegisterValue;
          const { ctx } = runTestIx(context, mul_upper_s_u, rA, rB, rD);
          expect(Z4(ctx.registers[rD]), `i=${i}`).toBe(
            -1n * 2n ** (BigInt(i) - 2n),
          );
        }
*/
      });
      it("div_u => rD = rA / rB", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, div_u_32, rA, rB, rD);
        // edgecase div by 0
        expect(ctx.registers[rD]).toBe(2n ** 64n - 1n);

        context.execution.registers[rB] = 3n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, div_u_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(3n);
      });
      it("div_s => rD = Z4_inv(Z4(rA) / Z4(rB))", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, div_s_32, rA, rB, rD);
        // edgecase div by 0
        expect(ctx.registers[rD]).toBe(2n ** 32n - 1n);

        // - / +
        context.execution.registers[rA] = BigInt(Z4_inv(-100)) as RegisterValue;
        context.execution.registers[rB] = 5n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, div_s_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(BigInt(Z8_inv(-20n)));

        // - / -
        context.execution.registers[rA] = BigInt(Z4_inv(-100)) as RegisterValue;
        context.execution.registers[rB] = BigInt(Z4_inv(-5)) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(context, div_s_32, rA, rB, rD);
        expect(p_context3.registers[rD]).toBe(BigInt(Z8_inv(20n)));

        // z4a = -2^31, z4b = -1
        context.execution.registers[rA] = BigInt(
          Z4_inv(-1 * 2 ** 31),
        ) as RegisterValue;
        context.execution.registers[rB] = BigInt(Z4_inv(-1)) as RegisterValue;
        const { ctx: p_context4 } = runTestIx(context, div_s_32, rA, rB, rD);
        expect(p_context4.registers[rD]).toBe(context.execution.registers[rA]);
      });
      it("rem_u => rD = rA % rB", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 0n as RegisterValue;
        const { ctx } = runTestIx(context, rem_u_32, rA, rB, rD);
        // edgecase div by 0
        expect(ctx.registers[rD]).toBe(10n);

        context.execution.registers[rB] = 3n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, rem_u_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(1n);
      });
      it("rem_s => rD = Z4_inv(Z4(rA) % Z4(rB))", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = BigInt(Z8_inv(-4n)) as RegisterValue;
        const { ctx } = runTestIx(context, rem_s_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(BigInt(Z8_inv(2n)));
      });
      it("set_lt_u => rD = rA < rB ? 1 : 0", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 20n as RegisterValue;
        const { ctx } = runTestIx(context, set_lt_u, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(1n);

        context.execution.registers[rA] = 20n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, set_lt_u, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(0n);
      });
      it("set_lt_s => rD = Z4(rA) < Z4(rB) ? 1 : 0", () => {
        context.execution.registers[rA] = 10n as RegisterValue;
        context.execution.registers[rB] = 20n as RegisterValue;
        const { ctx } = runTestIx(context, set_lt_s, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(1n);

        context.execution.registers[rA] = BigInt(Z4_inv(-20)) as RegisterValue;
        context.execution.registers[rB] = BigInt(Z4_inv(-10)) as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, set_lt_s, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(1n);

        context.execution.registers[rA] = BigInt(Z4_inv(-10)) as RegisterValue;
        context.execution.registers[rB] = BigInt(Z4_inv(-20)) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(context, set_lt_s, rA, rB, rD);
        expect(p_context3.registers[rD]).toBe(0n);
      });
      it("shlo_l => rD = rA << rB % 32", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 1n as RegisterValue;
        const { ctx } = runTestIx(context, shlo_l_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b10100n);

        context.execution.registers[rB] = 2n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, shlo_l_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(0b101000n);

        context.execution.registers[rB] = (32n + 2n) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(context, shlo_l_32, rA, rB, rD);
        expect(p_context3.registers[rD]).toBe(0b101000n);
      });
      it.skip("shlo_r => rD = rA >> rB % 32", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 1n as RegisterValue;
        const { ctx } = runTestIx(context, shlo_r_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b101n);

        context.execution.registers[rB] = 2n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, shlo_r_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(0b10n);

        context.execution.registers[rB] = (32n + 2n) as RegisterValue;
        const { ctx: p_context3 } = runTestIx(context, shlo_r_32, rA, rB, rD);
        expect(p_context3.registers[rD]).toBe(0b10n);
      });
      it("shar_r => rD = Z4_inv(Z4(rA) / 2^(rB % 32))", () => {
        context.execution.registers[rA] = 0b1010n as RegisterValue;
        context.execution.registers[rB] = 1n as RegisterValue;
        const { ctx } = runTestIx(context, shar_r_32, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0b101n);

        context.execution.registers[rA] = BigInt(
          Z4_inv(-1 * 2 ** 31),
        ) as RegisterValue;
        context.execution.registers[rB] = 1n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, shar_r_32, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(BigInt(Z4_inv(-1 * 2 ** 30)));
      });
      it("cmov_iz => rD = rB === 0 ? rA : rD", () => {
        context.execution.registers[rA] = 0n as RegisterValue;
        context.execution.registers[rB] = 0n as RegisterValue;
        context.execution.registers[rD] = 10n as RegisterValue;
        const { ctx } = runTestIx(context, cmov_iz, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(0n);

        context.execution.registers[rA] = 10n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, cmov_iz, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(10n);
      });
      it("cmov_nz => rD = rB !== 0 ? rA : rD", () => {
        context.execution.registers[rA] = 0n as RegisterValue;
        context.execution.registers[rB] = 0n as RegisterValue;
        context.execution.registers[rD] = 10n as RegisterValue;
        const { ctx } = runTestIx(context, cmov_nz, rA, rB, rD);
        expect(ctx.registers[rD]).toBe(10n);

        context.execution.registers[rA] = 12n as RegisterValue;
        context.execution.registers[rB] = 2n as RegisterValue;
        const { ctx: p_context2 } = runTestIx(context, cmov_nz, rA, rB, rD);
        expect(p_context2.registers[rD]).toBe(12n);
      });
    });
  });
}
