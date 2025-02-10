import { PVMIxEvaluateFNContext, u32 } from "@tsjam/types";
import { branch } from "@/utils/branch.js";
import { BlockTermination, Ix } from "@/instructions/ixdb.js";
import { Z } from "@/utils/zed.js";
import { E_sub } from "@tsjam/codec";
import assert from "node:assert";

// $(0.6.1 - A.22)
export const OneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  const lx = Math.min(4, bytes.length);
  const vX =
    BigInt(context.execution.instructionPointer) +
    Z(lx, E_sub(lx).decode(bytes.subarray(0, lx)).value);

  assert(vX >= 0n && vX <= 2n ** 32n, "jump location out of bounds");

  return { vX: <u32>Number(vX) };
};

export type OneOffsetArgs = ReturnType<typeof OneOffsetIxDecoder>;

class OneOffsetIxs {
  @Ix(40, OneOffsetIxDecoder)
  @BlockTermination
  jump({ vX }: OneOffsetArgs, context: PVMIxEvaluateFNContext) {
    return branch(context, vX, true);
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { createEvContext } = await import("@/test/mocks.js");
  describe("one_offset_ixs", () => {
    describe("decode", () => {
      it("should decode to 0 if no bytes provided", () => {
        expect(
          OneOffsetIxDecoder(new Uint8Array([]), createEvContext()),
        ).toEqual({ vX: 0 });
      });
      it("should decode to -1", () => {
        const context = createEvContext();
        context.execution.instructionPointer = <u32>2;
        expect(OneOffsetIxDecoder(new Uint8Array([255]), context)).toEqual({
          vX: 1,
        }); // 2 - 1
      });
    });
  });
}
