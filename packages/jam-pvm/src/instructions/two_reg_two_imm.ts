import { u32, u8 } from "@vekexasia/jam-types";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import assert from "node:assert";
import { LittleEndian } from "@vekexasia/jam-codec";
import { Z } from "@/utils/zed.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";

const create2Reg2ImmIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32]
  >["evaluate"],
): GenericPVMInstruction<
  [RegisterIdentifier, RegisterIdentifier, u32, u32]
> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      const rA = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
      const rB = Math.min(12, Math.floor(bytes[1] / 16)) as RegisterIdentifier;
      const lX = Math.min(4, bytes[2] % 8);
      const lY = Math.min(4, Math.max(0, bytes.length - 3));
      const vX = readVarIntFromBuffer(bytes.subarray(3, 3 + lX), lX as u8);
      const vY = readVarIntFromBuffer(
        bytes.subarray(3 + lX, 3 + lX + lY),
        lY as u8,
      );

      return [rA, rB, vX, vY];
    },
    evaluate,
  };
};

export const load_imm_jump_ind = create2Reg2ImmIx(
  42 as u8,
  "load_imm_jump_ind",
  (context, rA, rB, vx, vy) => {
    context.registers[rA] = vx;
    return djump(context, ((context.registers[rB] + vy) % 2 ** 32) as u32);
  },
);
