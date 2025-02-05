/* eslint-disable @typescript-eslint/no-unused-vars */
import { Result, err, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u8,
} from "@tsjam/types";
import { regIx } from "@/instructions/ixdb.js";
import { IxMod } from "@/instructions/utils.js";
import { Z8_inv, Z } from "@/utils/zed";

// $(0.6.1 - A.26)
const decode = (
  bytes: Uint8Array,
): Result<[RegisterIdentifier, RegisterIdentifier], PVMIxDecodeError> => {
  if (bytes.length < 1) {
    return err(new PVMIxDecodeError("not enough bytes"));
  }
  const rd = Math.min(12, bytes[0] % 16);
  const ra = Math.min(12, Math.floor(bytes[0] / 16));
  return ok([rd as RegisterIdentifier, ra as RegisterIdentifier]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<[RegisterIdentifier, RegisterIdentifier]>,
) => {
  return regIx<[wD: RegisterIdentifier, wA: RegisterIdentifier]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

const move_reg = create(100 as u8, "move_reg", (context, rd, ra) => {
  context.execution.registers[rd] = context.execution.registers[ra];
  return ok([IxMod.reg(rd, context.execution.registers[ra])]);
});

const sbrk = create(101 as u8, "sbrk", (context, rd, ra) => {
  // TODO: implement sbrk (space break)
  return ok([]);
});

const count_set_bits_64 = create(
  102 as u8,
  "count_set_bits_64",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    let sum = 0n;
    let val: bigint = wa;
    for (let i = 0; i < 64; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return ok([IxMod.reg(rd, sum)]);
  },
);

const count_set_bits_32 = create(
  103 as u8,
  "count_set_bits_32",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    let sum = 0n;
    let val: bigint = wa % 2n ** 32n;
    for (let i = 0; i < 32; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return ok([IxMod.reg(rd, sum)]);
  },
);

const leading_zero_bits_64 = create(
  104 as u8,
  "leading_zero_bits_64",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    const val: bigint = wa;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << (63n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return ok([IxMod.reg(rd, count)]);
  },
);

const leading_zero_bits_32 = create(
  105 as u8,
  "leading_zero_bits_32",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    const val: bigint = wa % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << (31n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return ok([IxMod.reg(rd, count)]);
  },
);

const trailing_zero_bits_64 = create(
  106 as u8,
  "trailing_zero_bits_64",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    const val: bigint = wa;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return ok([IxMod.reg(rd, count)]);
  },
);

const trailing_zero_bits_32 = create(
  107 as u8,
  "trailing_zero_bits_32",
  (context, rd, ra) => {
    const wa = context.execution.registers[ra];
    const val: bigint = wa % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return ok([IxMod.reg(rd, count)]);
  },
);

const sign_extend_8 = create(108 as u8, "sign_extend_8", (context, rd, ra) => {
  return ok([
    IxMod.reg(rd, Z8_inv(Z(1, context.execution.registers[ra] % 2n ** 8n))),
  ]);
});

const sign_extend_16 = create(
  109 as u8,
  "sign_extend_16",
  (context, rd, ra) => {
    return ok([
      IxMod.reg(rd, Z8_inv(Z(2, context.execution.registers[ra] % 2n ** 16n))),
    ]);
  },
);

const zero_extend_16 = create(
  110 as u8,
  "zero_extend_16",
  (context, rd, ra) => {
    return ok([IxMod.reg(rd, context.execution.registers[ra] % 2n ** 16n)]);
  },
);

const reverse_bytes = create(111 as u8, "reverse_bytes", (context, rd, ra) => {
  let newVal = 0n;
  const wa = context.execution.registers[ra];
  for (let i = 0; i < 8; i++) {
    newVal |= ((wa >> BigInt(i * 8)) & 0xffn) << BigInt((7 - i) * 8);
  }
  return ok([IxMod.reg(rd, newVal)]);
});
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("two_reg_ixs", () => {
    describe("decode", () => {
      it("should decode rD and rA properly", () => {
        expect(decode(new Uint8Array([13]))._unsafeUnwrap()).toEqual([12, 0]);
        expect(decode(new Uint8Array([1]))._unsafeUnwrap()).toEqual([1, 0]);
        expect(decode(new Uint8Array([1 + 1 * 16]))._unsafeUnwrap()).toEqual([
          1, 1,
        ]);
        expect(decode(new Uint8Array([1 + 13 * 16]))._unsafeUnwrap()).toEqual([
          1, 12,
        ]);
        expect(
          decode(
            new Uint8Array([1 + 13 * 16, 0xba, 0xcc, 0xe6, 0xaa]),
          )._unsafeUnwrap(),
        ).toEqual([1, 12]);
      });
      it("should fail if no bytes provided", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
      });
    });
    describe("ixs", () => {
      it("move_reg", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0xbacce6a0n as RegisterValue;
        move_reg.evaluate(
          context,
          1 as RegisterIdentifier,
          0 as RegisterIdentifier,
        );
        expect(context.execution.registers[1]).toBe(0xbacce6a0n);
      });
      it.skip("sbrk");
    });
  });
}
