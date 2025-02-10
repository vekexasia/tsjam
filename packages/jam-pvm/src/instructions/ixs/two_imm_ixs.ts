import { u32, u8 } from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { Ix } from "@/instructions/ixdb.js";
import { E_2, E_4, E_8, encodeWithCodec } from "@tsjam/codec";
import { IxMod } from "../utils";
import assert from "node:assert";

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.6.1 - A.21)
 */
export const TwoImmIxDecoder = (bytes: Uint8Array) => {
  let offset = 0;
  const lX = Math.min(4, bytes[0] % 8);
  offset += 1;

  assert(bytes.length >= offset + lX + (lX == 0 ? 1 : 0), "not enough bytes");
  const vX: u32 = Number(
    readVarIntFromBuffer(bytes.subarray(offset, offset + lX), lX as u8),
  ) as u32;
  offset += lX;

  const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
  const vY: bigint = readVarIntFromBuffer(
    bytes.subarray(1 + lX, 1 + lX + secondArgLength),
    secondArgLength as u8,
  );
  return { vX, vY };
};
export type TwoImmArgs = ReturnType<typeof TwoImmIxDecoder>;

class TwoImmIxs {
  @Ix(30, TwoImmIxDecoder)
  store_imm_u8({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, new Uint8Array([Number(vY % 256n)]))];
  }

  @Ix(31, TwoImmIxDecoder)
  store_imm_u16({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_2, vY % 2n ** 16n))];
  }

  @Ix(32, TwoImmIxDecoder)
  store_imm_u32({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_4, vY % 2n ** 32n))];
  }

  @Ix(33, TwoImmIxDecoder)
  store_imm_u64({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_8, BigInt(vY)))];
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("two_imm_ixs", () => {
    describe("decode", () => {
      it("decode just fine", () => {
        expect(
          TwoImmIxDecoder(new Uint8Array([1, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual({ vX: 0x44, vY: 0x33221155n });
        expect(
          TwoImmIxDecoder(new Uint8Array([4, 0x44, 0x55, 0x11, 0x22, 0x33])),
        ).toEqual({ vX: 0x22115544, vY: 0x33n });
        // mod 8 on first param and min 4
        expect(
          TwoImmIxDecoder(
            new Uint8Array([7 + 8, 0x44, 0x55, 0x11, 0x22, 0x33]),
          ),
        ).toEqual({ vX: 0x22115544, vY: 0x33n });
      });
    });
  });
}
