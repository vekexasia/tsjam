import { E_8, E_sub } from "@tsjam/codec";
import type { PVMIxEvaluateFNContextImpl } from "@/impls";
import {
  u8,
  RegisterIdentifier,
  u32,
  i32,
  PVMRegisterRawValue,
} from "@tsjam/types";
import assert from "node:assert";
import { readVarIntFromBuffer } from "../utils/varint";
import { Z } from "../utils/zed";

export const NoArgIxDecoder = () => null;
export type NoArgIxArgs = ReturnType<typeof NoArgIxDecoder>;

// $(0.6.4 - A.20)
export const OneImmIxDecoder = (bytes: Uint8Array) => {
  const lx = Math.min(4, bytes.length);
  const vX = readVarIntFromBuffer(bytes, lx as u8);
  assert(vX <= 255n, "value is too large");
  return { vX: <u8>Number(readVarIntFromBuffer(bytes, lx as u8)) };
};

export type OneImmArgs = ReturnType<typeof OneImmIxDecoder>;

// $(0.6.4 - A.21)
export const OneRegOneExtImmArgsIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;

  const vX = E_8.decode(bytes.subarray(1, 1 + 8)).value;

  return { rA, wA: context.execution.registers.elements[rA], vX };
};

export type OneRegOneExtImmArgs = ReturnType<
  typeof OneRegOneExtImmArgsIxDecoder
>;

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.6.4 - A.22)
 */
export const TwoImmIxDecoder = (bytes: Uint8Array) => {
  let offset = 0;
  const lX = Math.min(4, bytes[0] % 8);
  offset += 1;

  assert(bytes.length >= offset + lX + (lX == 0 ? 1 : 0), "not enough bytes");
  const vX = Number(
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

// $(0.6.4 - A.23)
export const OneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  const lx = Math.min(4, bytes.length);
  const vX =
    BigInt(context.execution.instructionPointer) +
    Z(lx, E_sub(lx).decode(bytes.subarray(0, lx)).value);

  assert(vX >= 0n && vX <= 2n ** 32n, "jump location out of bounds");

  return { vX: <u32>Number(vX) };
};

export type OneOffsetArgs = ReturnType<typeof OneOffsetIxDecoder>;

// $(0.6.4 - A.24)
export const OneRegOneImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = <PVMRegisterRawValue>(
    readVarIntFromBuffer(bytes.subarray(1), lx as u8)
  );
  return { rA, vX, wA: context.execution.registers.elements[rA] };
};

export type OneRegOneImmArgs = ReturnType<typeof OneRegOneImmIxDecoder>;

// $(0.6.4 - A.25)
export const OneRegTwoImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8);
  const vY = readVarIntFromBuffer(bytes.subarray(1 + lx), ly as u8);
  return { wA: context.execution.registers.elements[ra], vX, vY };
};

export type OneRegTwoImmArgs = ReturnType<typeof OneRegTwoImmIxDecoder>;
//
// $(0.6.4 - A.26)
export const OneRegOneIMMOneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  // console.log(Buffer.from(bytes).toString("hex"));
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(
    bytes.subarray(1, 1 + lx),
    lx as u8,
  ) as PVMRegisterRawValue;
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset

  const offset = Number(
    Z(ly, E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value),
  ) as u32;
  // console.log(
  //   "offset data = ",
  //   Buffer.from(bytes.subarray(2 + lx, 1 + lx + ly)).toString("hex"),
  //   ", E_(ly).decode() = ",
  //   E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value,
  //   ", offset =",
  //   offset,
  // );

  // console.log(
  //   "dakk",
  //   Z(2, 63091n),
  //   Z_inv(2, -2275n),
  //   Buffer.from(encodeWithCodec(E_2, Z_inv(2, -2275n))).toString("hex"),
  // );
  const vY = <u32>(context.execution.instructionPointer + offset);
  const wA = context.execution.registers.elements[rA];
  // console.log({ rA, lx, ly, vX, vY, offset });
  return { rA, wA, vX, vY };
};

export type OneRegOneIMMOneOffsetArgs = ReturnType<
  typeof OneRegOneIMMOneOffsetIxDecoder
>;

// $(0.6.4 - A.27)
export const TwoRegIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rD = <RegisterIdentifier>Math.min(12, bytes[0] % 16);
  const rA = <RegisterIdentifier>Math.min(12, Math.floor(bytes[0] / 16));
  return { rD, wA: context.execution.registers.elements[rA] };
};

export type TwoRegArgs = ReturnType<typeof TwoRegIxDecoder>;

// $(0.6.4 - A.28)
export const TwoRegOneImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return {
    rA,
    rB,
    vX,
    wA: context.execution.registers.elements[rA],
    wB: context.execution.registers.elements[rB],
  };
};

export type TwoRegOneImmArgs = ReturnType<typeof TwoRegOneImmIxDecoder>;

// $(0.6.4 - A.29)
export const TwoRegOneOffsetIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const offset = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return {
    wA: context.execution.registers.elements[rA],
    wB: context.execution.registers.elements[rB],
    offset,
  };
};

export type TwoRegOneOffsetArgs = ReturnType<typeof TwoRegOneOffsetIxDecoder>;

// $(0.6.4 - A.30)
export const TwoRegTwoImmIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
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

  return {
    vX,
    vY,
    rA,
    wA: context.execution.registers.elements[rA],
    wB: context.execution.registers.elements[rB],
  };
};

export type TwoRegTwoImmIxArgs = ReturnType<typeof TwoRegTwoImmIxDecoder>;

// $(0.6.4 - A.31)
export const ThreeRegIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContextImpl,
) => {
  assert(bytes.length >= 2, "not enough bytes (2)");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return {
    rD,
    wA: context.execution.registers.elements[rA],
    wB: context.execution.registers.elements[rB],
  };
};

export type ThreeRegArgs = ReturnType<typeof ThreeRegIxDecoder>;
