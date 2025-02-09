import { readVarIntFromBuffer } from "@/utils/varint";
import { Z } from "@/utils/zed";
import { E_sub } from "@tsjam/codec";
import { i32, PVMRegisters, RegisterIdentifier, u8 } from "@tsjam/types";
import assert from "node:assert";

// $(0.6.1 - A.27)
export const TwoRegOneImmIxsDecoder = (
  bytes: Uint8Array,
  registers: PVMRegisters,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return { rA, rB, vX, wA: registers[rA], wB: registers[rB] };
};

// :decode.type = "TwoRegOneImmIxsDecoder";

// $(0.6.1 - A.29)
export const TwoRegTwoImmDecoder = (
  bytes: Uint8Array,
  registers: PVMRegisters,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  assert(bytes.length >= 2, "not enough bytes [1]");

  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  assert(bytes.length >= 2 + lX, "not enough bytes [2]");

  const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8);
  const vY = readVarIntFromBuffer(
    bytes.subarray(2 + lX, 2 + lX + lY),
    lY as u8,
  );

  return { rA, rB, vX, vY, wA: registers[rA], wB: registers[rB] };
};

export type TwoRegTwoImmArgs = ReturnType<typeof TwoRegTwoImmDecoder>;

// $(0.6.1 - A.28)
const TwoRegOneOffsetDecoder = (bytes: Uint8Array, registers: PVMRegisters) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return { wA: registers[rA], wB: registers[rB], offset };
};

export type TwoRegOneOffsetArgs = ReturnType<typeof TwoRegOneOffsetDecoder>;

// $(0.6.1 - A.27)
const decode = (bytes: Uint8Array, registers: PVMRegisters) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  assert(bytes.length >= 2, "not enough bytes [1]");

  const lX = Math.min(4, bytes[1] % 8);
  const lY = Math.min(4, Math.max(0, bytes.length - 2 - lX));
  assert(bytes.length >= 2 + lX, "not enough bytes [2]");

  const vX = readVarIntFromBuffer(bytes.subarray(2, 2 + lX), lX as u8);
  const vY = readVarIntFromBuffer(
    bytes.subarray(2 + lX, 2 + lX + lY),
    lY as u8,
  );

  return { rA, rB, vX, vY, wA: registers[rA], wB: registers[rB] };
};
decode.type = "TwoRegTwoImmIxsDecoder";
