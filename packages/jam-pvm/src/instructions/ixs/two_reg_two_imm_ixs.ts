import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  PVMProgramExecutionContext,
  PVMRegisters,
  RegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { regIx } from "@/instructions/ixdb.js";
import { IxMod } from "../utils";
import assert from "node:assert";

// $(0.6.1 - A.27)
const decode = (bytes: Uint8Array, registers: PVMRegisters) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  assert(bytes.length >= 2, "not enough bytes [1]");

  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  assert(bytes.length >= 2 + lX, "not enough bytes [2]");

  const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8);
  const vY = readVarIntFromBuffer(
    bytes.subarray(2 + lX, 2 + lX + lY),
    lY as u8,
  );

  return { rA, rB, vX, vY, wA: registers[rA], wB: registers[rB] };
};
decode.type = "TwoRegTwoImmIxsDecoder";
type Args = ReturnType<typeof decode>;

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<Args>,
  blockTermination: boolean = false,
) => {
  return regIx<Args>({
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

const load_imm_jump_ind = create(
  180 as u8,
  "load_imm_jump_ind",
  ({ vY, vX, rA, wB }, context) => {
    return djump(context, Number((wB + vY) % 2n ** 32n) as u32, [
      IxMod.reg(rA, vX),
    ]);
  },
  true,
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("two_reg_two_imm_ixs", () => {
    describe("decode", () => {
      it("should fail if not enough bytes", () => {
        expect(() =>
          decode(new Uint8Array([]), [] as unknown as PVMRegisters),
        ).to.throw("not enough bytes [1]");
        expect(() =>
          decode(new Uint8Array([0]), [] as unknown as PVMRegisters),
        ).to.throw("not enough bytes [1]");
        expect(() =>
          decode(new Uint8Array([0, 1]), [] as unknown as PVMRegisters),
        ).to.throw("not enough bytes [2]");
      });
    });
  });
}
