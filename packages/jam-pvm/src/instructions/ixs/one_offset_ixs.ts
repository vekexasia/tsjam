import { Gas, u32, u8 } from "@tsjam/types";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";
import { Z } from "@/utils/zed.js";
import { E_sub } from "@tsjam/codec";
import { beforeAll } from "vitest";
import { Result, ok } from "neverthrow";

// $(0.5.3 - A.18)
const decode = (bytes: Uint8Array): Result<[offset: bigint], never> => {
  const lx = Math.min(4, bytes.length);
  const vx = E_sub(lx).decode(bytes.subarray(0, lx)).value;
  return ok([Z(lx, vx)]);
};

const jump = regIx<[offset: bigint]>({
  opCode: 40 as u8,
  identifier: "jump",
  blockTermination: true,
  ix: {
    decode,
    evaluate(context, vx) {
      const addr = context.execution.instructionPointer + Number(vx);
      return branch(context, addr as u32, true);
    },
    gasCost: 1n as Gas,
  },
});

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;

  const { toTagged } = await import("@tsjam/utils");
  const { createEvContext } = await import("@/test/mocks.js");
  const b = await import("@/utils/branch.js");
  describe("one_offset_ixs", () => {
    beforeAll(() => {
      vi.spyOn(b, "branch").mockReturnValue(ok([]));
    });
    describe("decode", () => {
      it("should decode to 0 if no bytes provided", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrap()).toEqual([0n]);
      });
      it("should decode to -1", () => {
        expect(decode(new Uint8Array([255]))._unsafeUnwrap()).toEqual([-1n]);
      });
      it("should decode to 1", () => {
        expect(decode(new Uint8Array([1]))._unsafeUnwrap()).toEqual([1n]);
      });
      it("should decode to 256", () => {
        expect(decode(new Uint8Array([0, 1]))._unsafeUnwrap()).toEqual([256n]);
      });
    });
    describe("jump", () => {
      it("should propagate value to branch", () => {
        const context = createEvContext();
        context.execution.instructionPointer = toTagged(10);
        jump.evaluate(context, 1n);
        expect(branch).toHaveBeenCalledWith(context, 11, true);
        jump.evaluate(context, -1n);
        expect(branch).toHaveBeenCalledWith(context, 9, true);
      });
    });
  });
}
