import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { regIx } from "@/instructions/ixdb.js";
import { Result, err, ok } from "neverthrow";
import { IxMod } from "../utils";

// $(0.6.1 - A.27)
const decode = (
  bytes: Uint8Array,
): Result<
  [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: bigint, vy: bigint],
  PVMIxDecodeError
> => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  if (bytes.length < 2) {
    return err(new PVMIxDecodeError("not enough bytes [1]"));
  }

  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  if (bytes.length < 2 + lX) {
    return err(new PVMIxDecodeError("not enough bytes [2]"));
  }
  const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8);
  const vY = readVarIntFromBuffer(
    bytes.subarray(2 + lX, 2 + lX + lY),
    lY as u8,
  );

  return ok([rA, rB, vX, vY]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: bigint, vy: bigint]
  >,
  blockTermination?: true,
) => {
  return regIx<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: bigint, vy: bigint]
  >({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

export const load_imm_jump_ind = create(
  180 as u8,
  "load_imm_jump_ind",
  (context, rA, rB, vx, vy) => {
    return djump(
      context,
      Number((context.execution.registers[rB] + vy) % 2n ** 32n) as u32,
      [IxMod.reg(rA, vx)],
    );
  },
  true,
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("two_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if not enough bytes", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes [1]",
        );
        expect(decode(new Uint8Array([0]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes [1]",
        );
        expect(
          decode(new Uint8Array([0, 1]))._unsafeUnwrapErr().message,
        ).toEqual("not enough bytes [2]");
      });
    });
  });
}
