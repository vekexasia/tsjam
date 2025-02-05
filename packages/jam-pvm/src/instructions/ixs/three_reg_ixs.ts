/* eslint-disable @typescript-eslint/no-unused-vars */
import { Result, err, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { Z4, Z8_inv } from "@/utils/zed.js";
import { regIx } from "@/instructions/ixdb.js";
import { IxMod, X_4 } from "@/instructions/utils.js";

type EvaluateType = [
  wA: RegisterValue,
  wB: RegisterValue,
  rD: RegisterIdentifier,
];
type InputType = [RegisterIdentifier, RegisterIdentifier, RegisterIdentifier];

// $(0.6.1 - A.30)
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

const add_32 = create(190 as u8, "add_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, X_4((wA + wB) % 2n ** 32n))]);
});

const sub_32 = create(191 as u8, "sub_32", (context, wA, wB, rD) => {
  return ok([
    IxMod.reg(rD, X_4((wA + 2n ** 32n - (wB % 2n ** 32n)) % 2n ** 32n)),
  ]);
});

const mul_32 = create(192 as u8, "mul_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, X_4((wA * wB) % 2n ** 32n))]);
});

const div_u_32 = create(193 as u8, "div_u_32", (context, wA, wB, rD) => {
  if (wB % 2n ** 32n === 0n) {
    return ok([IxMod.reg(rD, 2n ** 64n - 1n)]);
  } else {
    return ok([IxMod.reg(rD, wA / wB)]); // NOTE: this was math.floor but bigint division is already trunctaing
  }
});

const div_s_32 = create(194 as u8, "div_s_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA % 2n ** 32n);
  const z4b = Z4(wB % 2n ** 32n);
  let newVal: number | bigint;
  if (z4b === 0) {
    newVal = 2n ** 64n - 1n;
  } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
    newVal = Z8_inv(BigInt(z4a));
  } else {
    newVal = Z8_inv(BigInt(Math.trunc(z4a / z4b)));
  }

  return ok([IxMod.reg(rD, newVal)]);
});

const rem_u_32 = create(195 as u8, "rem_u_32", (context, wA, wB, rD) => {
  let newVal: number | bigint;
  if (wB % 2n ** 32n === 0n) {
    newVal = X_4(wA % 2n ** 32n);
  } else {
    newVal = X_4((wA % 2n ** 32n) % (wB % 2n ** 32n));
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const rem_s_32 = create(196 as u8, "rem_s_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA % 2n ** 32n);
  const z4b = Z4(wB % 2n ** 32n);
  let newVal: number | bigint;
  if (z4b === 0) {
    newVal = Z8_inv(BigInt(z4a));
  } else if (z4a === -1 * 2 ** 31 && z4b === -1) {
    newVal = 0;
  } else {
    newVal = Z8_inv(BigInt(z4a % z4b));
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const shlo_l_32 = create(197 as u8, "shlo_l_32", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, X_4((wA << wB % 32n) % 2n ** 32n))]);
});

const shlo_r_32 = create(198 as u8, "shlo_r_32", (context, wA, wB, rD) => {
  const wa_32 = Number(wA % 2n ** 32n);
  const wb_32 = Number(wB % 2n ** 32n);
  return ok([IxMod.reg(rD, X_4(BigInt(wa_32 >>> wb_32)))]);
});

const shar_r_32 = create(199 as u8, "shar_r_32", (context, wA, wB, rD) => {
  const z4a = Z4(wA % 2n ** 32n);
  return ok([
    IxMod.reg(rD, Z8_inv(BigInt(Math.floor(z4a / 2 ** Number(wB % 32n))))),
  ]);
});

const add_64 = create(200 as u8, "add_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + wB) % 2n ** 64n)]);
});

const sub_64 = create(201 as u8, "sub_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA + 2n ** 64n - wB) % 2n ** 64n)]);
});

const mul_64 = create(202 as u8, "mul_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA * wB) % 2n ** 64n)]);
});

const div_u_64 = create(203 as u8, "div_u_64", (context, wA, wB, rD) => {
  if (wB === 0n) {
    return ok([IxMod.reg(rD, 2n ** 64n - 1n)]);
  } else {
    return ok([IxMod.reg(rD, wA / wB)]);
  }
});

const div_s_64 = create(204 as u8, "div_s_64", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const z8b = Z8(wB);
  let newVal: number | bigint;
  if (wB === 0n) {
    newVal = 2n ** 64n - 1n;
  } else if (z8a == -1n * 2n ** 63n && z8b === -1n) {
    newVal = wA;
  } else {
    newVal = Z8_inv(z8a / z8b);
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const rem_u_64 = create(205 as u8, "rem_u_64", (context, wA, wB, rD) => {
  let newVal: number | bigint;
  if (wB === 0n) {
    newVal = wA;
  } else {
    newVal = wA % wB;
  }
  return ok([IxMod.reg(rD, newVal)]);
});

const rem_s_64 = create(206 as u8, "rem_s_64", (context, wA, wB, rD) => {
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

const shlo_l_64 = create(207 as u8, "shlo_l_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (wA << wB % 64n) % 2n ** 64n)]);
});

const shlo_r_64 = create(208 as u8, "shlo_r_64", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA / 2n ** (wB % 64n))]);
});

const shar_r_64 = create(209 as u8, "shar_r_64", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const dividend = 2n ** (wB % 64n);
  let result = z8a / dividend;
  if (z8a < 0n && dividend > 0n && z8a % dividend !== 0n) {
    result -= 1n;
  }
  return ok([IxMod.reg(rD, Z8_inv(result))]);
});

const and = create(210 as u8, "and", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA & wB)]);
});

const xor = create(211 as u8, "xor", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA ^ wB)]);
});

const or = create(212 as u8, "or", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA | wB)]);
});

const mul_upper_s_s = create(
  213 as u8,
  "mul_upper_s_s",
  (context, wA, wB, rD) => {
    return ok([IxMod.reg(rD, Z8_inv((Z8(wA) * Z8(wB)) / 2n ** 64n))]);
  },
);

const mul_upper_u_u = create(
  214 as u8,
  "mul_upper_u_u",
  (context, wA, wB, rD) => {
    return ok([IxMod.reg(rD, (wA * wB) / 2n ** 64n)]);
  },
);

const mul_upper_s_u = create(
  215 as u8,
  "mul_upper_s_u",
  (context, wA, wB, rD) => {
    const mult = Z8(wA) * wB;
    let val = mult / 2n ** 64n;
    if (val < 0n && mult % 2n ** 64n !== 0n) {
      val--;
    }
    return ok([IxMod.reg(rD, Z8_inv(val))]);
  },
);

const set_lt_u = create(216 as u8, "set_lt_u", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA < wB ? 1 : 0)]);
});

const set_lt_s = create(217 as u8, "set_lt_s", (context, wA, wB, rD) => {
  const z4a = Z8(wA);
  const z4b = Z8(wB);
  return ok([IxMod.reg(rD, z4a < z4b ? 1 : 0)]);
});

const cmov_iz = create(218 as u8, "cmov_iz", (context, wA, wB, rD) => {
  if (wB === 0n) {
    return ok([IxMod.reg(rD, wA)]);
  }
  return ok([]);
});

const cmov_nz = create(219 as u8, "cmov_nz", (context, wA, wB, rD) => {
  if (wB !== 0n) {
    return ok([IxMod.reg(rD, wA)]);
  }
  return ok([]);
});

const rot_l_64 = create(220 as u8, "rot_l_64", (context, wA, wB, rD) => {
  const shift = wB & 63n; // ensure its in the range 0-63
  const mask = 2n ** 64n - 1n;
  const result = ((wA << shift) | (wA >> (64n - shift))) & mask;
  return ok([IxMod.reg(rD, result)]);
});

const rot_l_32 = create(221 as u8, "rot_l_32", (context, _wA, wB, rD) => {
  const wA = _wA % 2n ** 32n;
  const shift = wB & 31n; // ensure its in the range 0-31
  const mask = 2n ** 32n - 1n;
  const result = ((wA << shift) | (wA >> (32n - shift))) & mask;
  return ok([IxMod.reg(rD, X_4(result))]);
});

const rot_r_64 = create(222 as u8, "rot_r_64", (context, wA, wB, rD) => {
  const shift = wB & 63n; // ensure its in the range 0-63
  const mask = 2n ** 64n - 1n;
  const result = ((wA >> shift) | (wA << (64n - shift))) & mask;
  return ok([IxMod.reg(rD, result)]);
});

const rot_r_32 = create(223 as u8, "rot_r_32", (context, _wA, wB, rD) => {
  const wA = _wA % 2n ** 32n;
  const shift = wB & 31n; // ensure its in the range 0-31
  const mask = 2n ** 32n - 1n;
  const result = ((wA >> shift) | (wA << (32n - shift))) & mask;
  return ok([IxMod.reg(rD, X_4(result))]);
});

const and_inv = create(224 as u8, "and_inv", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA & ~wB)]);
});

const or_inv = create(225 as u8, "or_inv", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (2n ** 64n + (wA | ~wB)) % 2n ** 64n)]);
});

const xnor = create(226 as u8, "xnor", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, (2n ** 64n + ~(wA ^ wB)) % 2n ** 64n)]);
});

const max = create(227 as u8, "max", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const z8b = Z8(wB);
  // gp at 0.6.1  is wrong here
  return ok([IxMod.reg(rD, z8a > z8b ? wA : wB)]);
});

const max_u = create(228 as u8, "max_u", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA > wB ? wA : wB)]);
});

const min = create(229 as u8, "min", (context, wA, wB, rD) => {
  const z8a = Z8(wA);
  const z8b = Z8(wB);
  return ok([IxMod.reg(rD, z8a < z8b ? wA : wB)]);
});

const min_u = create(230 as u8, "min_u", (context, wA, wB, rD) => {
  return ok([IxMod.reg(rD, wA < wB ? wA : wB)]);
});
