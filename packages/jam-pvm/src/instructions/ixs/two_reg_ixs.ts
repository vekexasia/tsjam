import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { RegisterIdentifier } from "@/types.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
const decode = (
  bytes: Uint8Array,
): [RegisterIdentifier, RegisterIdentifier] => {
  assert(bytes.length >= 1, "not enough bytes");
  const rd = Math.min(12, bytes[0] % 16);
  const ra = Math.min(12, Math.floor(bytes[0] / 16));
  return [rd as RegisterIdentifier, ra as RegisterIdentifier];
};

const create = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[RegisterIdentifier, RegisterIdentifier]>,
) => {
  return regIx<[wD: RegisterIdentifier, wA: RegisterIdentifier]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
    },
  });
};

const move_reg = create(82 as u8, "move_reg", (context, rd, ra) => {
  context.registers[rd] = context.registers[ra];
  return {};
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sbrk = create(87 as u8, "sbrk", (context, rd, ra) => {
  //TODO implement sbrk (space break)
  return {};
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("two_reg_ixs", () => {
    describe("decode", () => {
      it("should decode rD and rA properly", () => {
        expect(decode(new Uint8Array([13]))).toEqual([12, 0]);
        expect(decode(new Uint8Array([1]))).toEqual([1, 0]);
        expect(decode(new Uint8Array([1 + 1 * 16]))).toEqual([1, 1]);
        expect(decode(new Uint8Array([1 + 13 * 16]))).toEqual([1, 12]);
        expect(
          decode(new Uint8Array([1 + 13 * 16, 0xba, 0xcc, 0xe6, 0xaa])),
        ).toEqual([1, 12]);
      });
      it("should fail if no bytes provided", () => {
        expect(() => decode(new Uint8Array([]))).toThrow();
      });
    });
    describe("ixs", () => {
      it("move_reg", () => {
        const context = createEvContext();
        context.registers[0] = 0xbacce6a0 as u32;
        move_reg.evaluate(
          context,
          1 as RegisterIdentifier,
          0 as RegisterIdentifier,
        );
        expect(context.registers[1]).toBe(0xbacce6a0);
      });
      it.skip("sbrk");
    });
  });
}
