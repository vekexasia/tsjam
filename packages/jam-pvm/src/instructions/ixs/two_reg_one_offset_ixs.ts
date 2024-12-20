import {
  Gas,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  i32,
  u32,
  u8,
} from "@tsjam/types";
import { Z, Z4, Z4_inv } from "@/utils/zed.js";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";
import { E_sub } from "@tsjam/codec";
import { Result, ok } from "neverthrow";

// $(0.5.3 - A.24)
const decode = (
  bytes: Uint8Array,
): Result<
  [rA: RegisterIdentifier, rB: RegisterIdentifier, offset: i32],
  never
> => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return ok([rA, rB, offset]);
};
const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<
    [rA: RegisterIdentifier, rB: RegisterIdentifier, offset: i32]
  >,
  blockTermination?: true,
) => {
  return regIx<[rA: RegisterIdentifier, rB: RegisterIdentifier, offset: i32]>({
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

export const branch_eq = create(
  150 as u8,
  "branch_eq",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      context.execution.registers[rA] === context.execution.registers[rB],
    );
  },
  true,
);

export const branch_ne = create(
  151 as u8,
  "branch_ne",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      context.execution.registers[rA] !== context.execution.registers[rB],
    );
  },
  true,
);

export const branch_lt_u = create(
  152 as u8,
  "branch_lt_u",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      context.execution.registers[rA] < context.execution.registers[rB],
    );
  },
  true,
);

export const branch_lt_s = create(
  153 as u8,
  "branch_lt_s",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(4, context.execution.registers[rA]) <
        Z(4, context.execution.registers[rB]),
    );
  },
  true,
);

export const branch_ge_u = create(
  154 as u8,
  "branch_ge_u",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      context.execution.registers[rA] >= context.execution.registers[rB],
    );
  },
  true,
);

export const branch_ge_s = create(
  155 as u8,
  "branch_ge_s",
  (context, rA, rB, offset) => {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(4, context.execution.registers[rA]) >=
        Z(4, context.execution.registers[rB]),
    );
  },
  true,
);

if (import.meta.vitest) {
  const { beforeAll, describe, expect, it, vi } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  const b = await import("@/utils/branch.js");
  describe("two_reg_one_offset_ixs", () => {
    beforeAll(() => {
      vi.spyOn(b, "branch").mockReturnValue(ok([] as unknown as never));
    });
    describe("decode", () => {
      it("should decode rA, rB and offset properly", () => {
        expect(decode(new Uint8Array([0]))).toEqual(ok([0, 0, 0]));
        expect(decode(new Uint8Array([1]))).toEqual(ok([1, 0, 0]));
        expect(decode(new Uint8Array([13]))).toEqual(ok([12, 0, 0]));
        expect(decode(new Uint8Array([16]))).toEqual(ok([0, 1, 0]));
        expect(decode(new Uint8Array([16 * 13]))).toEqual(ok([0, 12, 0]));
        expect(decode(new Uint8Array([0, 0xba, 0xcc, 0xe6, 0xaa]))).toEqual(
          ok([0, 0, Z4(0xaae6ccba)]),
        );
      });
    });
    describe("ixs", () => {
      let context: ReturnType<typeof createEvContext>;
      beforeAll(() => {
        context = createEvContext();
      });
      it("branch_eq", () => {
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xdeadbeefn as RegisterValue;
        branch_eq.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
        context.execution.registers[1] = 0xdeadbeeen as RegisterValue;
        branch_eq.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
      });
      it("branch_ne", () => {
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xdeadbeefn as RegisterValue;
        branch_ne.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.execution.registers[1] = 0xdeadbeeen as RegisterValue;
        branch_ne.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
      });
      it("branch_lt_u", () => {
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xdeadbeeen as RegisterValue;
        branch_lt_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.execution.registers[1] = 0xdeadbeffn as RegisterValue;
        branch_lt_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
      });
      it("branch_lt_s", () => {
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xdeadbeeen as RegisterValue;
        branch_lt_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.execution.registers[1] = 0xdeadbeffn as RegisterValue;
        branch_lt_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);
      });
      it("branch_ge_u", () => {
        context.execution.registers[0] = 0xdeadbeefn as RegisterValue;
        context.execution.registers[1] = 0xdeadbeeen as RegisterValue;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);

        context.execution.registers[0] = 0xdeadbeeen as RegisterValue;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);

        context.execution.registers[0] = 0xdeadbeedn as RegisterValue;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenNthCalledWith(2, context, 2, false);
      });
      it("branch_ge_s", () => {
        context.execution.registers[0] = BigInt(Z4_inv(-2)) as RegisterValue;
        context.execution.registers[1] = BigInt(Z4_inv(-2)) as RegisterValue;
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);

        context.execution.registers[0] = BigInt(Z4_inv(-1)) as RegisterValue;
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);

        context.execution.registers[0] = BigInt(Z4_inv(-3)) as RegisterValue;
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as i32,
        );
        expect(branch).toHaveBeenNthCalledWith(2, context, 2, false);
      });
    });
  });
}
