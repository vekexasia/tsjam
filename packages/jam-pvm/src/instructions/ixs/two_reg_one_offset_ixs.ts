import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { Z } from "@/utils/zed.js";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";

const create2Reg1OffsetIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, offset: u32]
  >,
  blockTermination?: true,
) => {
  return regIx<[rA: RegisterIdentifier, rB: RegisterIdentifier, offset: u32]>({
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
        const lX = Math.min(4, Math.max(0, bytes.length - 2));
        const offset: u32 = Z(
          lX,
          Number(LittleEndian.decode(bytes.subarray(2, 2 + lX))),
        );
        return [rA, rB, offset];
      },
      evaluate,
    },
  });
};

export const branch_eq = create2Reg1OffsetIx(
  24 as u8,
  "branch_eq",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      context.registers[rA] === context.registers[rB],
    );
  },
  true,
);

export const branch_ne = create2Reg1OffsetIx(
  30 as u8,
  "branch_ne",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      context.registers[rA] !== context.registers[rB],
    );
  },
  true,
);

export const branch_lt_u = create2Reg1OffsetIx(
  47 as u8,
  "branch_lt_u",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      context.registers[rA] < context.registers[rB],
    );
  },
  true,
);

export const branch_lt_s = create2Reg1OffsetIx(
  48 as u8,
  "branch_lt_s",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      Z(4, context.registers[rA]) < Z(4, context.registers[rB]),
    );
  },
  true,
);

export const branch_ge_u = create2Reg1OffsetIx(
  41 as u8,
  "branch_ge_u",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      context.registers[rA] >= context.registers[rB],
    );
  },
  true,
);

export const branch_ge_s = create2Reg1OffsetIx(
  43 as u8,
  "branch_ge_s",
  (context, rA, rB, offset) => {
    return branch(
      context,
      offset,
      Z(4, context.registers[rA]) < Z(4, context.registers[rB]),
    );
  },
  true,
);
