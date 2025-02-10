/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  PVMIxEvaluateFNContext,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { Z4, Z8, Z8_inv } from "@/utils/zed.js";
import { Ix } from "@/instructions/ixdb.js";
import { IxMod, X_4 } from "@/instructions/utils.js";
import assert from "node:assert";

// $(0.6.1 - A.30)
const ThreeRegIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length >= 2, "not enough bytes (2)");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return {
    rD,
    wA: context.execution.registers[rA],
    wB: context.execution.registers[rB],
  };
};

export type ThreeRegArgs = ReturnType<typeof ThreeRegIxDecoder>;

class ThreeRegIxs {
  @Ix(190, ThreeRegIxDecoder)
  add_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA + wB) % 2n ** 32n))];
  }

  @Ix(191, ThreeRegIxDecoder)
  sub_32({ wA, wB, rD }: ThreeRegArgs) {
    return [
      IxMod.reg(rD, X_4((wA + 2n ** 32n - (wB % 2n ** 32n)) % 2n ** 32n)),
    ];
  }

  @Ix(192, ThreeRegIxDecoder)
  mul_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA * wB) % 2n ** 32n))];
  }

  @Ix(193, ThreeRegIxDecoder)
  div_u_32({ wA, wB, rD }: ThreeRegArgs) {
    if (wB % 2n ** 32n === 0n) {
      return [IxMod.reg(rD, 2n ** 64n - 1n)];
    } else {
      return [IxMod.reg(rD, wA / wB)]; // NOTE: this was math.floor but bigint division is already trunctaing
    }
  }

  @Ix(194, ThreeRegIxDecoder)
  div_s_32({ wA, wB, rD }: ThreeRegArgs) {
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

    return [IxMod.reg(rD, newVal)];
  }

  @Ix(195, ThreeRegIxDecoder)
  rem_u_32({ wA, wB, rD }: ThreeRegArgs) {
    let newVal: number | bigint;
    if (wB % 2n ** 32n === 0n) {
      newVal = X_4(wA % 2n ** 32n);
    } else {
      newVal = X_4((wA % 2n ** 32n) % (wB % 2n ** 32n));
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(196, ThreeRegIxDecoder)
  rem_s_32({ wA, wB, rD }: ThreeRegArgs) {
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
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(197, ThreeRegIxDecoder)
  shlo_l_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA << wB % 32n) % 2n ** 32n))];
  }

  @Ix(198, ThreeRegIxDecoder)
  shlo_r_32({ wA, wB, rD }: ThreeRegArgs) {
    const wa_32 = Number(wA % 2n ** 32n);
    const wb_32 = Number(wB % 2n ** 32n);
    return [IxMod.reg(rD, X_4(BigInt(wa_32 >>> wb_32)))];
  }

  @Ix(199, ThreeRegIxDecoder)
  shar_r_32({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z4(wA % 2n ** 32n);
    return [
      IxMod.reg(rD, Z8_inv(BigInt(Math.floor(z4a / 2 ** Number(wB % 32n))))),
    ];
  }

  @Ix(200, ThreeRegIxDecoder)
  add_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA + wB) % 2n ** 64n)];
  }

  @Ix(201, ThreeRegIxDecoder)
  sub_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA + 2n ** 64n - wB) % 2n ** 64n)];
  }

  @Ix(202, ThreeRegIxDecoder)
  mul_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA * wB) % 2n ** 64n)];
  }

  @Ix(203, ThreeRegIxDecoder)
  div_u_64({ wA, wB, rD }: ThreeRegArgs) {
    if (wB === 0n) {
      return [IxMod.reg(rD, 2n ** 64n - 1n)];
    } else {
      return [IxMod.reg(rD, wA / wB)];
    }
  }

  @Ix(204, ThreeRegIxDecoder)
  div_s_64({ wA, wB, rD }: ThreeRegArgs) {
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
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(205, ThreeRegIxDecoder)
  rem_u_64({ wA, wB, rD }: ThreeRegArgs) {
    let newVal: number | bigint;
    if (wB === 0n) {
      newVal = wA;
    } else {
      newVal = wA % wB;
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(206, ThreeRegIxDecoder)
  rem_s_64({ wA, wB, rD }: ThreeRegArgs) {
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
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(207, ThreeRegIxDecoder)
  shlo_l_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA << wB % 64n) % 2n ** 64n)];
  }

  @Ix(208, ThreeRegIxDecoder)
  shlo_r_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA / 2n ** (wB % 64n))];
  }

  @Ix(209, ThreeRegIxDecoder)
  shar_r_64({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA);
    const dividend = 2n ** (wB % 64n);
    let result = z8a / dividend;
    if (z8a < 0n && dividend > 0n && z8a % dividend !== 0n) {
      result -= 1n;
    }
    return [IxMod.reg(rD, Z8_inv(result))];
  }

  @Ix(210, ThreeRegIxDecoder)
  and({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA & wB)];
  }

  @Ix(211, ThreeRegIxDecoder)
  xor({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA ^ wB)];
  }

  @Ix(212, ThreeRegIxDecoder)
  or({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA | wB)];
  }

  @Ix(213, ThreeRegIxDecoder)
  mul_upper_s_s({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, Z8_inv((Z8(wA) * Z8(wB)) / 2n ** 64n))];
  }

  @Ix(214 as u8, ThreeRegIxDecoder)
  mul_upper_u_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA * wB) / 2n ** 64n)];
  }

  @Ix(215, ThreeRegIxDecoder)
  mul_upper_s_u({ wA, wB, rD }: ThreeRegArgs) {
    const mult = Z8(wA) * wB;
    let val = mult / 2n ** 64n;
    if (val < 0n && mult % 2n ** 64n !== 0n) {
      val--;
    }
    return [IxMod.reg(rD, Z8_inv(val))];
  }

  @Ix(216, ThreeRegIxDecoder)
  set_lt_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA < wB ? 1 : 0)];
  }

  @Ix(217, ThreeRegIxDecoder)
  set_lt_s({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z8(wA);
    const z4b = Z8(wB);
    return [IxMod.reg(rD, z4a < z4b ? 1 : 0)];
  }

  @Ix(218, ThreeRegIxDecoder)
  cmov_iz({ wA, wB, rD }: ThreeRegArgs) {
    if (wB === 0n) {
      return [IxMod.reg(rD, wA)];
    }
    return [];
  }

  @Ix(219, ThreeRegIxDecoder)
  cmov_nz({ wA, wB, rD }: ThreeRegArgs) {
    if (wB !== 0n) {
      return [IxMod.reg(rD, wA)];
    }
    return [];
  }

  @Ix(220, ThreeRegIxDecoder)
  rot_l_64({ wA, wB, rD }: ThreeRegArgs) {
    const shift = wB & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA << shift) | (wA >> (64n - shift))) & mask;
    return [IxMod.reg(rD, result)];
  }

  @Ix(221, ThreeRegIxDecoder)
  rot_l_32({ wA: _wA, wB, rD }: ThreeRegArgs) {
    const wA = _wA % 2n ** 32n;
    const shift = wB & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA << shift) | (wA >> (32n - shift))) & mask;
    return [IxMod.reg(rD, X_4(result))];
  }

  @Ix(222, ThreeRegIxDecoder)
  rot_r_64({ wA, wB, rD }: ThreeRegArgs) {
    const shift = wB & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA >> shift) | (wA << (64n - shift))) & mask;
    return [IxMod.reg(rD, result)];
  }

  @Ix(223, ThreeRegIxDecoder)
  rot_r_32({ wA: _wA, wB, rD }: ThreeRegArgs) {
    const wA = _wA % 2n ** 32n;
    const shift = wB & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA >> shift) | (wA << (32n - shift))) & mask;
    return [IxMod.reg(rD, X_4(result))];
  }

  @Ix(224, ThreeRegIxDecoder)
  and_inv({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA & ~wB)];
  }

  @Ix(225, ThreeRegIxDecoder)
  or_inv({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (2n ** 64n + (wA | ~wB)) % 2n ** 64n)];
  }

  @Ix(226, ThreeRegIxDecoder)
  xnor({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (2n ** 64n + ~(wA ^ wB)) % 2n ** 64n)];
  }

  @Ix(227, ThreeRegIxDecoder)
  max({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA);
    const z8b = Z8(wB);
    // gp at 0.6.1  is wrong here
    return [IxMod.reg(rD, z8a > z8b ? wA : wB)];
  }

  @Ix(228, ThreeRegIxDecoder)
  max_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA > wB ? wA : wB)];
  }

  @Ix(229, ThreeRegIxDecoder)
  min({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA);
    const z8b = Z8(wB);
    return [IxMod.reg(rD, z8a < z8b ? wA : wB)];
  }

  @Ix(230, ThreeRegIxDecoder)
  min_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA < wB ? wA : wB)];
  }
}
