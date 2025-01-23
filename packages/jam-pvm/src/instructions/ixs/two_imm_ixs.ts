import { Gas, PVMIxDecodeError, PVMIxEvaluateFN, u32, u8 } from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import { E_2, E_4, E_8, encodeWithCodec } from "@tsjam/codec";
import { Result, err, ok } from "neverthrow";
import { IxMod } from "../utils";

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.5.4 - A.19)
 */
export const decode = (
  bytes: Uint8Array,
): Result<[vX: u32, vY: u32], PVMIxDecodeError> => {
  let offset = 0;
  const lX = Math.min(4, bytes[0] % 8);
  offset += 1;

  if (bytes.length < offset + lX + (lX == 0 ? 1 : 0)) {
    return err(new PVMIxDecodeError("not enough bytes"));
  }
  const first: u32 = Number(
    readVarIntFromBuffer(bytes.subarray(offset, offset + lX), lX as u8),
  ) as u32;
  offset += lX;

  const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
  const second: u32 = Number(
    readVarIntFromBuffer(
      bytes.subarray(1 + lX, 1 + lX + secondArgLength),
      secondArgLength as u8,
    ),
  ) as u32;
  return ok([first, second]);
};

const create = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<[vX: u32, vY: u32]>,
) => {
  return regIx({
    opCode: identifier,
    identifier: name,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

const store_imm_u8 = create(
  30 as u8,
  "store_imm_u8",
  (context, offset, value) => {
    return ok([IxMod.memory(offset, new Uint8Array([value % 256]))]);
  },
);

const store_imm_u16 = create(
  31 as u8,
  "store_imm_u16",
  (context, offset, value) => {
    const tmp = new Uint8Array(2);
    E_2.encode(BigInt(value % 2 ** 16), tmp);
    return ok([IxMod.memory(offset, tmp)]);
  },
);

const store_imm_u32 = create(
  32 as u8,
  "store_imm_u32",
  (context, offset, value) => {
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(value), tmp);
    return ok([IxMod.memory(offset, tmp)]);
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const store_imm_u64 = create(
  33 as u8,
  "store_imm_u64",
  (context, offset, value) => {
    return ok([IxMod.memory(offset, encodeWithCodec(E_8, BigInt(value)))]);
  },
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  const { runTestIx } = await import("@/test/mocks.js");
  type Mock = import("@vitest/spy").Mock;
  describe("two_imm_ixs", () => {
    describe("decode", () => {
      it("decode just fine", () => {
        expect(decode(new Uint8Array([0, 0]))._unsafeUnwrap()).toEqual([0, 0]);
        expect(decode(new Uint8Array([1, 0x44]))._unsafeUnwrap()).toEqual([
          0x44, 0,
        ]);
        expect(decode(new Uint8Array([0, 0x44]))._unsafeUnwrap()).toEqual([
          0, 0x44,
        ]);
        expect(
          decode(
            new Uint8Array([1, 0x44, 0x55, 0x11, 0x22, 0x33]),
          )._unsafeUnwrap(),
        ).toEqual([0x44, 0x33221155]);
        expect(
          decode(
            new Uint8Array([4, 0x44, 0x55, 0x11, 0x22, 0x33]),
          )._unsafeUnwrap(),
        ).toEqual([0x22115544, 0x33]);
        // mod 8 on first param and min 4
        expect(
          decode(
            new Uint8Array([7 + 8, 0x44, 0x55, 0x11, 0x22, 0x33]),
          )._unsafeUnwrap(),
        ).toEqual([0x22115544, 0x33]);
      });
      it("should throw if not enough bytes", () => {
        expect(decode(new Uint8Array([0]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
        expect(decode(new Uint8Array([1]))._unsafeUnwrapErr().message).toEqual(
          "not enough bytes",
        );
        expect(
          decode(new Uint8Array([2, 0]))._unsafeUnwrapErr().message,
        ).toEqual("not enough bytes");
      });
    });
    describe("ixs", () => {
      it("store_imm_u8", () => {
        const context = createEvContext();
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx } = runTestIx(context, store_imm_u8, 0x100, 0x4422);
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x100, new Uint8Array([0x22])],
        ]);
      });
      it("store_imm_u16", () => {
        const context = createEvContext();
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx } = runTestIx(context, store_imm_u16, 0x100, 0x44221133);
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x100, new Uint8Array([0x33, 0x11])],
        ]);
      });
      it("store_imm_u32", () => {
        const context = createEvContext();
        (context.execution.memory.canWrite as Mock).mockReturnValueOnce(true);
        const { ctx } = runTestIx(context, store_imm_u32, 0x100, 0x44221133);
        expect((ctx.memory.setBytes as Mock).mock.calls).toEqual([
          [0x100, new Uint8Array([0x33, 0x11, 0x22, 0x44])],
        ]);
      });
    });
  });
}
