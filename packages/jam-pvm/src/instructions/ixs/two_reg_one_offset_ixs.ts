import {
  Gas,
  PVMIxEvaluateFN,
  PVMRegisters,
  RegisterIdentifier,
  i32,
  u32,
  u8,
} from "@tsjam/types";
import { Z } from "@/utils/zed.js";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";
import { E_sub } from "@tsjam/codec";

// $(0.6.1 - A.28)
const TwoRegOneOffsetDecoder = (bytes: Uint8Array, registers: PVMRegisters) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return { wA: registers[rA], wB: registers[rB], offset };
};

export type TwoRegTwoOffsetArgs = ReturnType<typeof TwoRegOneOffsetDecoder>;

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<TwoRegTwoOffsetArgs>,
  blockTermination?: true,
) => {
  return regIx(
    {
      opCode: identifier,
      identifier: name,
      decode: TwoRegOneOffsetDecoder,
      evaluate,
      gasCost: 1n as Gas,
    },
    blockTermination,
  );
};

create(
  170 as u8,
  "branch_eq",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA === wB,
    );
  },
  true,
);

create(
  171 as u8,
  "branch_ne",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA !== wB,
    );
  },
  true,
);

create(
  172 as u8,
  "branch_lt_u",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA < wB,
    );
  },
  true,
);

create(
  173 as u8,
  "branch_lt_s",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(8, wA) < Z(8, wB),
    );
  },
  true,
);

create(
  174 as u8,
  "branch_ge_u",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA >= wB,
    );
  },
  true,
);

create(
  175 as u8,
  "branch_ge_s",
  ({ wA, wB, offset }, context) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(8, wA) >= Z(8, wB),
    );
  },
  true,
);

if (import.meta.vitest) {
  const { beforeAll, describe, expect, it, vi } = import.meta.vitest;
  const b = await import("@/utils/branch.js");
  describe("two_reg_one_offset_ixs", () => {
    beforeAll(() => {
      vi.spyOn(b, "branch").mockReturnValue([] as unknown as never);
    });
    describe.skip("decode", () => {
      /* FIXME: reImplement
      it("should decode rA, rB and offset properly", () => {
        expect(decode(new Uint8Array([0]))).toEqual([0, 0, 0]);
        expect(decode(new Uint8Array([1]))).toEqual([1, 0, 0]);
        expect(decode(new Uint8Array([13]))).toEqual([12, 0, 0]);
        expect(decode(new Uint8Array([16]))).toEqual([0, 1, 0]);
        expect(decode(new Uint8Array([16 * 13]))).toEqual([0, 12, 0]);
        expect(decode(new Uint8Array([0, 0xba, 0xcc, 0xe6, 0xaa]))).toEqual([
          0,
          0,
          Z4(0xaae6ccba),
        ]);
      });
      */
    });
  });
}
