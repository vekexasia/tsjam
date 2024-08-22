import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { Z, Z4, Z4_inv } from "@/utils/zed.js";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";
import { EvaluationContext } from "@/evaluationContext.js";
import { E_sub } from "@vekexasia/jam-codec";
const decode = (
  bytes: Uint8Array,
): [rA: RegisterIdentifier, rB: RegisterIdentifier, offset: u32] => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset: u32 = Z(
    lX,
    Number(E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  );
  return [rA, rB, offset];
};
const create = (
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
      decode,
      evaluate,
    },
  });
};

export const branch_eq = create(
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

export const branch_ne = create(
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

export const branch_lt_u = create(
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

export const branch_lt_s = create(
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

export const branch_ge_u = create(
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

export const branch_ge_s = create(
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

if (import.meta.vitest) {
  const { beforeAll, vi, describe, expect, it } = import.meta.vitest;
  vi.mock("@/utils/branch.js", () => ({
    branch: vi.fn(),
  }));
  const { createEvContext } = await import("@/test/mocks.js");
  type Mock = import("@vitest/spy").Mock;
  describe("two_reg_one_offset_ixs", () => {
    describe("decode", () => {
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
    });
    describe("ixs", () => {
      let context: EvaluationContext;
      beforeAll(() => {
        context = createEvContext();
      });
      it("branch_eq", () => {
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xdeadbeef as u32;
        branch_eq.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
        context.registers[1] = 0xdeadbeee as u32;
        branch_eq.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
      });
      it("branch_ne", () => {
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xdeadbeef as u32;
        branch_ne.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.registers[1] = 0xdeadbeee as u32;
        branch_ne.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
      });
      it("branch_lt_u", () => {
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xdeadbeee as u32;
        branch_lt_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.registers[1] = 0xdeadbeff as u32;
        branch_lt_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);
      });
      it("branch_lt_s", () => {
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xdeadbeee as u32;
        branch_lt_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, false);
        context.registers[1] = 0xdeadbeff as u32;
        branch_lt_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);
      });
      it("branch_ge_u", () => {
        context.registers[0] = 0xdeadbeef as u32;
        context.registers[1] = 0xdeadbeee as u32;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);

        context.registers[0] = 0xdeadbeee as u32;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);

        context.registers[0] = 0xdeadbeed as u32;
        branch_ge_u.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenNthCalledWith(2, context, 2, false);
      });
      it("branch_ge_s", () => {
        context.registers[0] = Z4_inv(-2);
        context.registers[1] = Z4_inv(-2);
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenCalledWith(context, 2, true);

        context.registers[0] = Z4_inv(-1);
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenNthCalledWith(1, context, 2, true);

        context.registers[0] = Z4_inv(-3);
        branch_ge_s.evaluate(
          context,
          0 as RegisterIdentifier,
          1 as RegisterIdentifier,
          2 as u32,
        );
        expect(branch).toHaveBeenNthCalledWith(2, context, 2, false);
      });
    });
  });
}
