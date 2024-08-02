import { u32, u8 } from "@vekexasia/jam-types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { RegisterIdentifier } from "@/types.js";
import { LittleEndian } from "@vekexasia/jam-codec";
import { Z } from "@/utils/zed.js";

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

export const decode1Reg1IMM = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, value: u32] => {
  const ra = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 2));
  const vx = readVarIntFromBuffer(bytes.subarray(2), lx as u8);
  return [ra, vx];
};

export const decode1Reg2iMM = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, value1: u32, value2: u32] => {
  const ra = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[1] / 16) % 8);
  const ly = Math.min(4, Math.max(0, bytes.length - 2 - lx));
  const vx = readVarIntFromBuffer(bytes.subarray(2, 2 + lx), lx as u8);
  const vy = readVarIntFromBuffer(bytes.subarray(2 + lx), ly as u8);
  return [ra, vx, vy];
};

export const decode1Reg1IMM1Offset = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, vx: u32, offset: u32] => {
  const ra = Math.min(12, bytes[1] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[1] / 16) % 8);
  const ly = Math.min(4, Math.max(0, bytes.length - 2 - lx));
  const vx = readVarIntFromBuffer(bytes.subarray(2, 2 + lx), lx as u8);
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset
  const offset = Z(
    ly,
    Number(LittleEndian.decode(bytes.subarray(2 + lx, 2 + lx + ly))),
  ) as u32;
  return [ra, vx, offset];
};
