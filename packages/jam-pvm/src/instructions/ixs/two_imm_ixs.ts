import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { LittleEndian } from "@vekexasia/jam-codec";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction (included opcode)
 * @param bytes
 */
export const decode2IMM = (bytes: Uint8Array): [offset: u32, value: u32] => {
  let offset = 1;
  const firstArgLength = Math.min(4, bytes[1]);
  offset += 1;

  const first: u32 = readVarIntFromBuffer(
    bytes.subarray(offset, offset + firstArgLength),
    firstArgLength as u8,
  );
  offset += firstArgLength;

  const secondArgLength = Math.min(4, Math.max(0, bytes.length - offset));
  const second: u32 = readVarIntFromBuffer(
    bytes.subarray(2 + firstArgLength, 2 + firstArgLength + secondArgLength),
    secondArgLength as u8,
  );
  return [first, second];
};

const create2ImmIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[vX: u32, vY: u32]>,
) => {
  return regIx({
    opCode: identifier,
    identifier: name,
    ix: {
      decode(bytes) {
        return decode2IMM(bytes);
      },
      evaluate,
    },
  });
};

export const store_imm_u8 = create2ImmIx(
  62 as u8,
  "store_imm_u8",
  (context, offset, value) => {
    context.memory.set(offset, (value % 256) as u8);
  },
);

export const store_imm_u16 = create2ImmIx(
  79 as u8,
  "store_imm_u16",
  (context, offset, value) => {
    const tmp = new Uint8Array(2);
    LittleEndian.encode(BigInt(value % 2 ** 16), tmp);
    context.memory.setBytes(offset, tmp);
  },
);

export const store_imm_u32 = create2ImmIx(
  38 as u8,
  "store_imm_u32",
  (context, offset, value) => {
    const tmp = new Uint8Array(4);
    LittleEndian.encode(BigInt(value), tmp);
    context.memory.setBytes(offset, tmp);
  },
);
