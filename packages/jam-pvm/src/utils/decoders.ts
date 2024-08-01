import { u32, u8 } from "@vekexasia/jam-types";
import { keys } from "webdriverio/build/commands/browser/keys.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";

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
