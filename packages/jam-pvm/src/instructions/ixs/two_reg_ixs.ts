import { Result, err, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u8,
} from "@tsjam/types";
import { regIx } from "@/instructions/ixdb.js";
import { IxMod } from "@/instructions/utils.js";

// $(0.5.0 - A.22)
const decode = (
  bytes: Uint8Array,
): Result<[RegisterIdentifier, RegisterIdentifier], PVMIxDecodeError> => {
  if (bytes.length < 1) {
    return err(new PVMIxDecodeError("not enough bytes"));
  }
  const rd = Math.min(12, bytes[0] % 16);
  const ra = Math.min(12, Math.floor(bytes[0] / 16));
  return ok([rd as RegisterIdentifier, ra as RegisterIdentifier]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<[RegisterIdentifier, RegisterIdentifier]>,
) => {
  return regIx<[wD: RegisterIdentifier, wA: RegisterIdentifier]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

const move_reg = create(100 as u8, "move_reg", (context, rd, ra) => {
  context.execution.registers[rd] = context.execution.registers[ra];
  return ok([IxMod.reg(rd, context.execution.registers[ra])]);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sbrk = create(101 as u8, "sbrk", (context, rd, ra) => {
  // TODO: implement sbrk (space break)
  return ok([]);
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("two_reg_ixs", () => {
    describe("decode", () => {
      it("should decode rD and rA properly", () => {
        expect(decode(new Uint8Array([13]))._unsafeUnwrap()).toEqual([12, 0]);
        expect(decode(new Uint8Array([1]))._unsafeUnwrap()).toEqual([1, 0]);
        expect(decode(new Uint8Array([1 + 1 * 16]))._unsafeUnwrap()).toEqual([
          1, 1,
        ]);
        expect(decode(new Uint8Array([1 + 13 * 16]))._unsafeUnwrap()).toEqual([
          1, 12,
        ]);
        expect(
          decode(
            new Uint8Array([1 + 13 * 16, 0xba, 0xcc, 0xe6, 0xaa]),
          )._unsafeUnwrap(),
        ).toEqual([1, 12]);
      });
      it("should fail if no bytes provided", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
      });
    });
    describe("ixs", () => {
      it("move_reg", () => {
        const context = createEvContext();
        context.execution.registers[0] = 0xbacce6a0n as RegisterValue;
        move_reg.evaluate(
          context,
          1 as RegisterIdentifier,
          0 as RegisterIdentifier,
        );
        expect(context.execution.registers[1]).toBe(0xbacce6a0n);
      });
      it.skip("sbrk");
    });
  });
}
