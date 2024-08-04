import { SeqOfLength, u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { Z4, Z4_inv } from "@/utils/zed.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { beforeEach } from "vitest";

type EvaluateType = [wA: u32, wB: u32, rD: RegisterIdentifier];
type InputType = [RegisterIdentifier, RegisterIdentifier, RegisterIdentifier];

const decode = (bytes: Uint8Array): InputType => {
  assert(bytes.length >= 2, "Not enough bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return [rA, rB, rD];
};

const create = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<EvaluateType>,
) => {
  return regIx<InputType>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate(context, rA, rB, rD) {
        return evaluate(
          context,
          context.registers[rA],
          context.registers[rB],
          rD,
        );
      },
    },
  });
};

const add = create(8 as u8, "add", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA + wB) % 2 ** 32) as u32;
});

const sub = create(20 as u8, "sub", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA + 2 ** 32 - wB) % 2 ** 32) as u32;
});

const and = create(23 as u8, "and", (context, wA, wB, rD) => {
  context.registers[rD] = (wA & wB) as u32;
});

const xor = create(28 as u8, "xor", (context, wA, wB, rD) => {
  context.registers[rD] = (wA ^ wB) as u32;
});

const or = create(12 as u8, "or", (context, wA, wB, rD) => {
  context.registers[rD] = (wA | wB) as u32;
});

const mul = create(34 as u8, "mul", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA * wB) % 2 ** 32) as u32;
});

const mul_upper_s_s = create(
  67 as u8,
  "mul_upper_s_s",
  (context, wA, wB, rD) => {
    context.registers[rD] = Z4_inv(Math.floor((Z4(wA) * Z4(wB)) / 2 ** 32));
  },
);

const mul_upper_u_u = create(
  57 as u8,
  "mul_upper_u_u",
  (context, wA, wB, rD) => {
    context.registers[rD] = Math.floor((wA * wB) / 2 ** 32) as u32;
  },
);

const mul_upper_s_u = create(
  81 as u8,
  "mul_upper_s_u",
  (context, wA, wB, rD) => {
    context.registers[rD] = Z4_inv(Math.floor((Z4(wA) * wB) / 2 ** 32));
  },
);

const div_u = create(68 as u8, "div", (context, wA, wB, rD) => {
  if (wB === 0) {
    context.registers[rD] = (2 ** 32 - 1) as u32;
  } else {
    context.registers[rD] = Math.floor(wA / wB) as u32;
  }
});

const div_s = create(64 as u8, "div_s", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  const z4b = Z4(wB);
  if (wB === 0) {
    context.registers[rD] = (2 ** 32 - 1) as u32;
  } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
    context.registers[rD] = wA;
  } else {
    context.registers[rD] = Z4_inv(Math.floor(z4a / z4b));
  }
});

const rem_u = create(73 as u8, "rem_u", (context, wA, wB, rD) => {
  if (wB === 0) {
    context.registers[rD] = wA;
  } else {
    context.registers[rD] = Math.floor(wA % wB) as u32;
  }
});

const rem_s = create(70 as u8, "rem_s", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  const z4b = Z4(wB);
  if (wB === 0) {
    context.registers[rD] = wA;
  } else if (z4a === -1 * 2 ** 31 && z4b === -1) {
    context.registers[rD] = 0 as u32;
  } else {
    context.registers[rD] = Z4_inv(z4a % z4b);
  }
});

const set_lt_u = create(36 as u8, "set_lt_u", (context, wA, wB, rD) => {
  context.registers[rD] = (wA < wB ? 1 : 0) as u32;
});

const set_lt_s = create(58 as u8, "set_lt_s", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  const z4b = Z4(wB);
  context.registers[rD] = (z4a < z4b ? 1 : 0) as u32;
});

const shlo_l = create(55 as u8, "shlo_l", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA << wB % 32) % 2 ** 32) as u32;
});

const shlo_r = create(51 as u8, "shlo_r", (context, wA, wB, rD) => {
  context.registers[rD] = (wA >> wB % 32) as u32;
});

const shar_r = create(77 as u8, "shar_r", (context, wA, wB, rD) => {
  const z4a = Z4(wA);
  context.registers[rD] = Z4_inv(Math.floor(z4a / 2 ** (wB % 32)));
});

const cmov_iz = create(83 as u8, "cmov_iz", (context, wA, wB, rD) => {
  if (wB === 0) {
    context.registers[rD] = wA;
  }
});

const cmov_nz = create(84 as u8, "cmov_nz", (context, wA, wB, rD) => {
  if (wB !== 0) {
    context.registers[rD] = wA;
  }
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("../../../test/mocks.js");

  describe("three_reg_ixs", () => {
    describe("decoding", () => {
      it("decodes properly", () => {
        const bytes = new Uint8Array([0x10, 0x02]);
        const [rA, rB, rD] = decode(bytes);
        expect(rA).toBe(0);
        expect(rB).toBe(1);
        expect(rD).toBe(2);
      });
      it("decodes with rD = 12", () => {
        const bytes = new Uint8Array([0x10, 0xff]);
        const [rA, rB, rD] = decode(bytes);
        expect(rA).toBe(0);
        expect(rB).toBe(1);
        expect(rD).toBe(12);
      });
      it("decodes rA = 12", () => {
        const bytes = new Uint8Array([14, 0xff]);
        const [rA] = decode(bytes);
        expect(rA).toBe(12);
      });
      it("decodes rB = 12", () => {
        const bytes = new Uint8Array([0xff, 0]);
        const [, rB] = decode(bytes);
        expect(rB).toBe(12);
      });
      it("throws when not enough bytes (2)", () => {
        const bytes = new Uint8Array([0x10]);
        expect(() => decode(bytes)).toThrow();
      });
      it("decodes properly even with extra bytes", () => {
        const bytes = new Uint8Array([0x10, 0x02, 0x03, 0x10, 0x02, 0x03]);
        const [rA, rB, rD] = decode(bytes);
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
        context.registers = new Array(13).fill(0) as SeqOfLength<u32, 13>;
      });
      it("add => rD = (rA + rB)%2^32", () => {
        context.registers[rA] = 1 as u32;
        context.registers[rB] = 2 as u32;
        context.registers[rD] = 0 as u32;
        add.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(3);

        context.registers[rA] = (2 ** 32 - 1) as u32;
        add.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(1);
      });
      it("sub => rD = (rA + 2^32 - rB)%2^32", () => {
        context.registers[rA] = 4 as u32;
        context.registers[rB] = 2 as u32;
        sub.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(2);

        context.registers[rA] = 1 as u32;
        sub.evaluate(context, rA, rB, rD);
        expect(context.registers[3]).toBe(2 ** 32 - 1);
      });
      it("and => rD = rA & rB", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 0b1100 as u32;
        and.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b1000);
      });
      it("xor => rD = rA ^ rB", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 0b1100 as u32;
        xor.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b0110);
      });
      it("or => rD = rA | rB", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 0b1100 as u32;
        or.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b1110);
      });
      it("mul => rD = (rA * rB)%2^32", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 20 as u32;
        mul.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(200);

        context.registers[rA] = (2 ** 31) as u32;
        context.registers[rB] = 2 as u32;
        mul.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0);
      });
      it("mul_upper_s_s => rD = Z4_inv(Z4(rA) * Z(4, rB) / 2^32)", () => {
        context.registers[rA] = (2 ** 30) as u32;
        for (let i = 2; i < 30; i++) {
          context.registers[rB] = (2 ** i) as u32;
          mul_upper_s_s.evaluate(context, rA, rB, rD);
          expect(context.registers[rD]).toBe(2 ** (i - 2));
        }
        // - * +
        context.registers[rA] = Z4_inv(-1 * 2 ** 30);
        for (let i = 2; i < 30; i++) {
          context.registers[rB] = (2 ** i) as u32;
          mul_upper_s_s.evaluate(context, rA, rB, rD);
          expect(Z4(context.registers[rD])).toBe(-1 * 2 ** (i - 2));
        }

        // - * -
        context.registers[rA] = Z4_inv(-1 * 2 ** 30);
        for (let i = 2; i < 30; i++) {
          context.registers[rB] = Z4_inv(-1 * 2 ** i) as u32;
          mul_upper_s_s.evaluate(context, rA, rB, rD);
          expect(Z4(context.registers[rD])).toBe(2 ** (i - 2));
        }
      });
      it("mul_upper_u_u => rD = (rA * rB) / 2^32", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = (2 ** 32) as u32;
        mul_upper_u_u.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(10);
      });
      it("mul_upper_s_u => rD = Z4_inv(Z4(rA) * rB / 2^32)", () => {
        context.registers[rA] = (2 ** 30) as u32;
        for (let i = 2; i < 30; i++) {
          context.registers[rB] = (2 ** i) as u32;
          mul_upper_s_u.evaluate(context, rA, rB, rD);
          expect(context.registers[rD]).toBe(2 ** (i - 2));
        }
        // - * +
        context.registers[rA] = Z4_inv(-1 * 2 ** 30);
        for (let i = 2; i < 30; i++) {
          context.registers[rB] = (2 ** i) as u32;
          mul_upper_s_u.evaluate(context, rA, rB, rD);
          expect(Z4(context.registers[rD])).toBe(-1 * 2 ** (i - 2));
        }
      });
      it("div_u => rD = rA / rB", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 0 as u32;
        div_u.evaluate(context, rA, rB, rD);
        // edgecase div by 0
        expect(context.registers[rD]).toBe(2 ** 32 - 1);

        context.registers[rB] = 3 as u32;
        div_u.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(3);
      });
      it("div_s => rD = Z4_inv(Z4(rA) / Z4(rB))", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 0 as u32;
        div_s.evaluate(context, rA, rB, rD);
        // edgecase div by 0
        expect(context.registers[rD]).toBe(2 ** 32 - 1);

        // - / +
        context.registers[rA] = Z4_inv(-100) as u32;
        context.registers[rB] = 5 as u32;
        div_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(Z4_inv(-20));

        // - / -
        context.registers[rA] = Z4_inv(-100) as u32;
        context.registers[rB] = Z4_inv(-5) as u32;
        div_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(Z4_inv(20));

        // z4a = -2^31, z4b = -1
        context.registers[rA] = Z4_inv(-1 * 2 ** 31) as u32;
        context.registers[rB] = Z4_inv(-1) as u32;
        div_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(context.registers[rA]);
      });
      it("rem_u => rD = rA % rB", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 0 as u32;
        rem_u.evaluate(context, rA, rB, rD);
        // edgecase div by 0
        expect(context.registers[rD]).toBe(10);

        context.registers[rB] = 3 as u32;
        rem_u.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(1);
      });
      it("rem_s => rD = Z4_inv(Z4(rA) % Z4(rB))", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = Z4_inv(-4) as u32;
        rem_s.evaluate(context, rA, rB, rD);
        // TODO:check if it is correct
        expect(context.registers[rD]).toBe(Z4_inv(2));
      });
      it("set_lt_u => rD = rA < rB ? 1 : 0", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 20 as u32;
        set_lt_u.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(1);

        context.registers[rA] = 20 as u32;
        set_lt_u.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0);
      });
      it("set_lt_s => rD = Z4(rA) < Z4(rB) ? 1 : 0", () => {
        context.registers[rA] = 10 as u32;
        context.registers[rB] = 20 as u32;
        set_lt_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(1);

        context.registers[rA] = Z4_inv(-20) as u32;
        context.registers[rB] = Z4_inv(-10) as u32;
        set_lt_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(1);

        context.registers[rA] = Z4_inv(-10) as u32;
        context.registers[rB] = Z4_inv(-20) as u32;
        set_lt_s.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0);
      });
      it("shlo_l => rD = rA << rB % 32", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 1 as u32;
        shlo_l.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b10100);

        context.registers[rB] = 2 as u32;
        shlo_l.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b101000);

        context.registers[rB] = (32 + 2) as u32;
        shlo_l.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b101000);
      });
      it("shlo_r => rD = rA >> rB % 32", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 1 as u32;
        shlo_r.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b101);

        context.registers[rB] = 2 as u32;
        shlo_r.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b10);

        context.registers[rB] = (32 + 2) as u32;
        shlo_r.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b10);
      });
      it("shar_r => rD = Z4_inv(Z4(rA) / 2^(rB % 32))", () => {
        context.registers[rA] = 0b1010 as u32;
        context.registers[rB] = 1 as u32;
        shar_r.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0b101);

        context.registers[rA] = Z4_inv(-1 * 2 ** 31) as u32;
        context.registers[rB] = 1 as u32;
        shar_r.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(Z4_inv(-1 * 2 ** 30));
      });
      it("cmov_iz => rD = rB === 0 ? rA : rD", () => {
        context.registers[rA] = 0 as u32;
        context.registers[rB] = 0 as u32;
        context.registers[rD] = 10 as u32;
        cmov_iz.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(0);

        context.registers[rA] = 10 as u32;
        cmov_iz.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(10);
      });
      it("cmov_nz => rD = rB !== 0 ? rA : rD", () => {
        context.registers[rA] = 0 as u32;
        context.registers[rB] = 0 as u32;
        context.registers[rD] = 10 as u32;
        cmov_nz.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(10);

        context.registers[rA] = 12 as u32;
        context.registers[rB] = 2 as u32;
        cmov_nz.evaluate(context, rA, rB, rD);
        expect(context.registers[rD]).toBe(12);
      });
    });
  });
}
