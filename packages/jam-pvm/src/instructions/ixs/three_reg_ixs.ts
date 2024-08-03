import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { Z, Z_inv } from "@/utils/zed.js";
import { regIx } from "@/instructions/ixdb.js";

type EvaluateType = [wA: u32, wB: u32, rD: RegisterIdentifier];
type InputType = [RegisterIdentifier, RegisterIdentifier, RegisterIdentifier];

const create3RegIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<EvaluateType>,
) => {
  return regIx<InputType>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode(bytes) {
        const rA = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
        const rB = Math.min(
          12,
          Math.floor(bytes[1] / 16),
        ) as RegisterIdentifier;
        const rD = Math.min(12, bytes[2]) as RegisterIdentifier;
        return [rA, rB, rD];
      },
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

export const add = create3RegIx(8 as u8, "add", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA + wB) % 2 ** 32) as u32;
});

export const sub = create3RegIx(20 as u8, "sub", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA + 2 ** 32 - wB) % 2 ** 32) as u32;
});

export const and = create3RegIx(23 as u8, "and", (context, wA, wB, rD) => {
  context.registers[rD] = (wA & wB) as u32;
});

export const xor = create3RegIx(28 as u8, "xor", (context, wA, wB, rD) => {
  context.registers[rD] = (wA ^ wB) as u32;
});

export const or = create3RegIx(12 as u8, "or", (context, wA, wB, rD) => {
  context.registers[rD] = (wA | wB) as u32;
});

export const mul = create3RegIx(34 as u8, "mul", (context, wA, wB, rD) => {
  context.registers[rD] = ((wA * wB) % 2 ** 32) as u32;
});

export const mul_upper_s_s = create3RegIx(
  67 as u8,
  "mul_upper_s_s",
  (context, wA, wB, rD) => {
    context.registers[rD] = Z_inv(
      4,
      Math.floor((Z(4, wA) * Z(4, wB)) / 2 ** 32),
    );
  },
);

export const mul_upper_u_u = create3RegIx(
  57 as u8,
  "mul_upper_u_u",
  (context, wA, wB, rD) => {
    context.registers[rD] = ((wA * wB) / 2 ** 32) as u32;
  },
);

export const mul_upper_s_u = create3RegIx(
  81 as u8,
  "mul_upper_s_u",
  (context, wA, wB, rD) => {
    context.registers[rD] = Z_inv(4, Math.floor((Z(4, wA) * wB) / 2 ** 32));
  },
);

export const div_u = create3RegIx(68 as u8, "div", (context, wA, wB, rD) => {
  if (wB === 0) {
    context.registers[rD] = (2 ** 32 - 1) as u32;
  } else {
    context.registers[rD] = Math.floor(wA / wB) as u32;
  }
});

export const div_s = create3RegIx(64 as u8, "div_s", (context, wA, wB, rD) => {
  const z4a = Z(4, wA);
  const z4b = Z(4, wB);
  if (wB === 0) {
    context.registers[rD] = (2 ** 32 - 1) as u32;
  } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
    context.registers[rD] = wA;
  } else {
    context.registers[rD] = Z_inv(4, Math.floor(z4a / z4b));
  }
});

export const rem_u = create3RegIx(73 as u8, "rem_u", (context, wA, wB, rD) => {
  if (wB === 0) {
    context.registers[rD] = wA;
  } else {
    context.registers[rD] = Math.floor(wA % wB) as u32;
  }
});

export const rem_s = create3RegIx(70 as u8, "rem_s", (context, wA, wB, rD) => {
  const z4a = Z(4, wA);
  const z4b = Z(4, wB);
  if (wB === 0) {
    context.registers[rD] = wA;
  } else if (z4a === -1 * 2 ** 31 && z4b === -1) {
    context.registers[rD] = 0 as u32;
  } else {
    context.registers[rD] = Z_inv(4, z4a % z4b);
  }
});

export const set_lt_u = create3RegIx(
  36 as u8,
  "set_lt_u",
  (context, wA, wB, rD) => {
    context.registers[rD] = (wA < wB ? 1 : 0) as u32;
  },
);

export const set_lt_s = create3RegIx(
  58 as u8,
  "set_lt_s",
  (context, wA, wB, rD) => {
    const z4a = Z(4, wA);
    const z4b = Z(4, wB);
    context.registers[rD] = (z4a < z4b ? 1 : 0) as u32;
  },
);

export const shlo_l = create3RegIx(
  55 as u8,
  "shlo_l",
  (context, wA, wB, rD) => {
    context.registers[rD] = ((wA << wB % 32) % 2 ** 32) as u32;
  },
);

export const shlo_r = create3RegIx(
  51 as u8,
  "shlo_r",
  (context, wA, wB, rD) => {
    context.registers[rD] = (wA >> wB % 32) as u32;
  },
);

export const shar_r = create3RegIx(
  77 as u8,
  "shar_r",
  (context, wA, wB, rD) => {
    const z4a = Z(4, wA);
    context.registers[rD] = Z_inv(4, Math.floor(z4a / 2 ** (wB % 32)));
  },
);

export const cmov_iz = create3RegIx(
  83 as u8,
  "cmov_iz",
  (context, wA, wB, rD) => {
    if (wB === 0) {
      context.registers[rD] = wA;
    }
  },
);

export const cmov_nz = create3RegIx(
  84 as u8,
  "cmov_nz",
  (context, wA, wB, rD) => {
    if (wB !== 0) {
      context.registers[rD] = wA;
    }
  },
);
