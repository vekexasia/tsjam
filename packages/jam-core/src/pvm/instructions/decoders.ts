import { E_8, E_sub } from "@tsjam/codec";
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
import { HydratedArgs } from "./types";

export const NoArgIxDecoder = () => ({});
export type NoArgIxArgs = ReturnType<typeof NoArgIxDecoder>;

// $(0.7.1 - A.21)
export const OneImmIxDecoder = (bytes: Uint8Array) => {
  const lx = Math.min(4, bytes.length);
  const vX = readVarIntFromBuffer(bytes, lx as u8);
  assert(vX <= 255n, "value is too large");
  return { vX: <u8>Number(readVarIntFromBuffer(bytes, lx as u8)) };
};

export type OneImmArgs = HydratedArgs<ReturnType<typeof OneImmIxDecoder>>;

// $(0.7.1 - A.22)
export const OneRegOneExtImmArgsIxDecoder = (bytes: Uint8Array) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;

  const vX = E_8.decode(bytes.subarray(1, 1 + 8)).value;

  return {
    rA,
    vX,
    wA: 0n, // will be hydrated later
  };
};

export type OneRegOneExtImmArgs = HydratedArgs<
  ReturnType<typeof OneRegOneExtImmArgsIxDecoder>
>;

/**
 * decode the full instruction from the bytes.
 * the byte array is chunked to include only the bytes of the instruction
 * $(0.7.1 - A.23)
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

export type TwoImmArgs = HydratedArgs<ReturnType<typeof TwoImmIxDecoder>>;

// $(0.7.1 - A.24)
export const OneOffsetIxDecoder = (bytes: Uint8Array) => {
  const lx = Math.min(4, bytes.length);
  const ipOffsetRaw: i32 = <i32>(
    Number(Z(lx, E_sub(lx).decode(bytes.subarray(0, lx)).value))
  );

  return {
    ipOffsetRaw,
    ipOffset: 0, // will be hydrated later
  };
};

export type OneOffsetArgs = HydratedArgs<ReturnType<typeof OneOffsetIxDecoder>>;

// $(0.7.1 - A.25)
export const OneRegOneImmIxDecoder = (bytes: Uint8Array) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = <PVMRegisterRawValue>(
    readVarIntFromBuffer(bytes.subarray(1), lx as u8)
  );
  return {
    rA,
    vX,
    wA: 0n, // will be hydrated later
  };
};

export type OneRegOneImmArgs = HydratedArgs<
  ReturnType<typeof OneRegOneImmIxDecoder>
>;

// $(0.7.1 - A.26)
export const OneRegTwoImmIxDecoder = (bytes: Uint8Array) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8);
  const vY = readVarIntFromBuffer(bytes.subarray(1 + lx), ly as u8);
  return { rA, vX, vY };
};

export type OneRegTwoImmArgs = HydratedArgs<
  ReturnType<typeof OneRegTwoImmIxDecoder>
>;
//
// $(0.7.1 - A.27)
export const OneRegOneIMMOneOffsetIxDecoder = (bytes: Uint8Array) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");

  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vX = readVarIntFromBuffer(
    bytes.subarray(1, 1 + lx),
    lx as u8,
  ) as PVMRegisterRawValue;

  const ipOffsetRaw = Number(
    Z(ly, E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value),
  ) as i32;

  return {
    rA,
    vX,
    ipOffsetRaw,
    wA: 0n, // will be hydrated later
    ipOffset: 0, // will be hydrated later
  };
};

export type OneRegOneIMMOneOffsetArgs = HydratedArgs<
  ReturnType<typeof OneRegOneIMMOneOffsetIxDecoder>
>;

// $(0.7.1 - A.28)
export const TwoRegIxDecoder = (bytes: Uint8Array) => {
  assert(bytes.length > 0, "no input bytes");
  const rD = <RegisterIdentifier>Math.min(12, bytes[0] % 16);
  const rA = <RegisterIdentifier>Math.min(12, Math.floor(bytes[0] / 16));
  return {
    rA,
    rD,
    wA: 0n, // will be hydrated later
    wD: 0n, // will be hydrated later
  };
};

export type TwoRegArgs = HydratedArgs<ReturnType<typeof TwoRegIxDecoder>>;

// $(0.7.1 - A.29)
export const TwoRegOneImmIxDecoder = (bytes: Uint8Array) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const vX = readVarIntFromBuffer(bytes.subarray(1, 1 + lX), lX as u8);

  return {
    rA,
    rB,
    vX,
    wA: 0n, // will be hydrated later
    wB: 0n, // will be hydrated later
  };
};

export type TwoRegOneImmArgs = HydratedArgs<
  ReturnType<typeof TwoRegOneImmIxDecoder>
>;

// $(0.7.1 - A.30)
export const TwoRegOneOffsetIxDecoder = (bytes: Uint8Array) => {
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const lX = Math.min(4, Math.max(0, bytes.length - 1));
  const ipOffsetRaw = Number(
    Z(lX, E_sub(lX).decode(bytes.subarray(1, 1 + lX)).value),
  ) as i32;
  return {
    rA,
    rB,
    ipOffsetRaw,
  };
};

export type TwoRegOneOffsetArgs = HydratedArgs<
  ReturnType<typeof TwoRegOneOffsetIxDecoder>
>;

// $(0.7.1 - A.31)
export const TwoRegTwoImmIxDecoder = (bytes: Uint8Array) => {
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
    rB,
  };
};

export type TwoRegTwoImmIxArgs = HydratedArgs<
  ReturnType<typeof TwoRegTwoImmIxDecoder>
>;

// $(0.7.1 - A.32)
export const ThreeRegIxDecoder = (bytes: Uint8Array) => {
  assert(bytes.length >= 2, "not enough bytes (2)");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const rB = Math.min(12, Math.floor(bytes[0] / 16)) as RegisterIdentifier;
  const rD = Math.min(12, bytes[1]) as RegisterIdentifier;
  return {
    rA,
    rB,
    rD,
    wA: 0n, // will be hydrated later
    wB: 0n, // will be hydrated later
    wD: 0n, // will be hydrated later
  };
};

export type ThreeRegArgs = HydratedArgs<ReturnType<typeof ThreeRegIxDecoder>>;
