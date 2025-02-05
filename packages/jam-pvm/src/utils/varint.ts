import assert from "node:assert";
import { u8 } from "@tsjam/types";
import { E_sub } from "@tsjam/codec";
import { X_fn } from "@/instructions/utils";

/**
 * Reads a varint from a buffer. it follows the X formula from the graypaper appendix A.
 * @param buf - buffer to read from
 * @param length - length of the varint
 * $(0.6.1 - A.15)
 */
export const readVarIntFromBuffer = (buf: Uint8Array, length: u8) => {
  assert(length <= 8 && length >= 0, "length must be <= 8 and >= 0");
  const result = E_sub(length).decode(buf.subarray(0, length)).value;

  const lengthN = BigInt(length);
  if (lengthN === 0n) {
    return result;
  }
  return X_fn(lengthN)(result);
};
