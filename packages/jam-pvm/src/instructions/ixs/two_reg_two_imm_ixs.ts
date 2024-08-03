import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { djump } from "@/utils/djump.js";
import { regIx } from "@/instructions/ixdb.js";

const create2Reg2ImmIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32]
  >,
  blockTermination?: true,
) => {
  return regIx<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, vx: u32, vy: u32]
  >({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode(bytes) {
        const rA = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
        const rB = Math.min(
          12,
          Math.floor(bytes[1] / 16),
        ) as RegisterIdentifier;
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
    },
  });
};

export const load_imm_jump_ind = create2Reg2ImmIx(
  42 as u8,
  "load_imm_jump_ind",
  (context, rA, rB, vx, vy) => {
    context.registers[rA] = vx;
    return djump(context, ((context.registers[rB] + vy) % 2 ** 32) as u32);
  },
  true,
);
