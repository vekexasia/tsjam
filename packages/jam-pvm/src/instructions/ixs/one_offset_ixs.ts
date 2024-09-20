import { i32, u32, u8 } from "@vekexasia/jam-types";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";
import { Z } from "@/utils/zed.js";
import assert from "node:assert";
import { E_sub } from "@vekexasia/jam-codec";
import { beforeAll } from "vitest";

const decode = (bytes: Uint8Array): [offset: i32] => {
  const lx = Math.min(4, bytes.length);
  const vx = E_sub(lx).decode(bytes.subarray(0, lx)).value;
  return [Z(lx, Number(vx))];
};

const jump = regIx<[offset: i32]>({
  opCode: 5 as u8,
  identifier: "jump",
  blockTermination: true,
  ix: {
    decode,
    evaluate(context, vx) {
      const addr = context.execution.instructionPointer + vx;
      assert(addr >= 0, "address must be >= 0");
      return branch(context, addr as u32, true);
    },
    gasCost: 1n,
  },
});

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;

  const { toTagged } = await import("@vekexasia/jam-utils");
  const { createEvContext } = await import("@/test/mocks.js");
  const b = await import("@/utils/branch.js");
  describe("one_offset_ixs", () => {
    beforeAll(() => {
      vi.spyOn(b, "branch").mockReturnValue([]);
    });
    describe("decode", () => {
      it("should decode to 0 if no bytes provided", () => {
        expect(decode(new Uint8Array([]))).toEqual([0]);
      });
      it("should decode to -1", () => {
        expect(decode(new Uint8Array([255]))).toEqual([-1]);
      });
      it("should decode to 1", () => {
        expect(decode(new Uint8Array([1]))).toEqual([1]);
      });
      it("should decode to 256", () => {
        expect(decode(new Uint8Array([0, 1]))).toEqual([256]);
      });
    });
    describe("jump", () => {
      it("should propagate value to branch", () => {
        const context = createEvContext();
        context.execution.instructionPointer = toTagged(10);
        jump.evaluate(context, 1 as i32);
        expect(branch).toHaveBeenCalledWith(context, 11, true);
        jump.evaluate(context, -1 as i32);
        expect(branch).toHaveBeenCalledWith(context, 9, true);
      });
      it("should throw if address is negative", () => {
        const context = createEvContext();
        context.execution.instructionPointer = toTagged(10);
        expect(() => jump.evaluate(context, -11 as i32)).toThrow(
          "address must be >= 0",
        );
      });
    });
  });
}
