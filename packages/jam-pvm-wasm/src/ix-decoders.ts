import { PVMExitReason } from "./exit-reason";
import { varint, readLE } from "./varint";
import { Z } from "./zed";

// macro for not decodable ix
export function $notDecodableCheck(condition: boolean) {
  if (!condition) {
    // @ts-expect-error this is a macro
    this.gas -= 1 /* TRAP_GAS_COST */;
    return PVMExitReason.Panic;
  }
}

export function $oneImmIxDecoder(args: Uint8Array, vX: u64) {
  const lx = u8(Math.min(4, args.length));
  vX = varint(args.subarray(0, lx));
  $notDecodableCheck!(vX <= 255);
}

// $(0.7.1 - A.22)
export function $oneRegOneExtImmArgsIxDecoder(
  args: Uint8Array,
  rA: u8,
  vX: u64,
) {
  // OneRegOneExtImmArgsIxDecoder
  $notDecodableCheck!(args.length >= 9);
  rA = u8(Math.min(12, args[0] % 16));
  vX = readLE(args.subarray(1), 8);
}

// $(0.7.1 - A.23)
export function $twoImmIxDecoder(args: Uint8Array, vX: u64, vY: u64) {
  let offset: u32 = 0;
  const lX = u8(Math.min(4, args[0] % 8));
  offset += 1;

  $notDecodableCheck!(u32(args.length) >= u32(offset + lX + (lX == 0 ? 1 : 0)));
  vX = varint(args.subarray(offset, offset + lX));
  offset += lX;

  const secondArgLength = u8(Math.min(4, Math.max(0, args.length - offset)));
  vY = varint(args.subarray(1 + lX, 1 + lX + secondArgLength));
}

// $(0.7.1 - A.24)
export function $oneOffsetIxDecoder(args: Uint8Array, pc: u64, offset: u64) {
  const lx = u8(Math.min(4, args.length));
  const v = readLE(args.subarray(0, lx), lx);
  offset = pc + i32(Z(lx, v));
}

// $(0.7.1 - A.25)
export function $oneRegOneImmIxDecoder(args: Uint8Array, rA: u8, vX: u64) {
  $notDecodableCheck!(args.length > 0);
  rA = u8(Math.min(12, args[0] % 16));
  const lx = u8(Math.min(4, Math.max(0, args.length - 1)));
  //console.log(`rA: ${rA}, lx: ${lx}`);
  vX = varint(args.subarray(1, 1 + lx));
}

// $(0.7.1 - A.26)
export function $oneRegTwoImmIxDecoder(
  args: Uint8Array,
  rA: u8,
  vX: u64,
  vY: u64,
) {
  rA = u8(Math.min(12, args[0] % 16));
  const lx = u8(Math.min(4, Math.floor(args[0] / 16) % 8));
  $notDecodableCheck!(u32(args.length) >= lx + 1);

  const ly = u8(Math.min(4, Math.max(0, args.length - 1 - lx)));
  vX = varint(args.subarray(1, 1 + lx));
  vY = varint(args.subarray(1 + lx, 1 + lx + ly));
}

// $(0.7.1 - A.27)
export function $oneRegOneImmOneOffsetIxDecoder(
  args: Uint8Array,
  pc: u64,
  rA: u8,
  vX: u64,
  offset: u64,
) {
  $notDecodableCheck!(args.length > 0);
  rA = u8(Math.min(12, args[0] % 16));
  const lx = u8(Math.min(4, Math.floor(args[0] / 16) % 8));
  $notDecodableCheck!(u32(args.length) >= lx + 1);

  const ly = u8(Math.min(4, Math.max(0, args.length - 1 - lx)));
  vX = varint(args.subarray(1, 1 + lx));

  offset = pc + i32(Z(ly, readLE(args.subarray(1 + lx, 1 + lx + ly), ly)));
}

// $(0.7.1 - A.28)
export function $twoRegIxDecoder(args: Uint8Array, rA: u8, rD: u8) {
  $notDecodableCheck!(args.length > 0);
  rD = u8(Math.min(12, args[0] % 16));
  rA = u8(Math.min(12, Math.floor(args[0] / 16)));
}

// $(0.7.1 - A.28)
export function $twoRegOneImmIxDecoder(
  args: Uint8Array,
  rA: u8,
  rB: u8,
  vX: u64,
) {
  rA = u8(Math.min(12, args[0] % 16));
  rB = u8(Math.min(12, Math.floor(args[0] / 16)));
  const lX = u8(Math.min(4, Math.max(0, args.length - 1)));
  vX = varint(args.subarray(1, 1 + lX));
}

// $(0.7.1 - A.30)
export function $twoRegOneOffsetIxDecoder(
  args: Uint8Array,
  pc: u32,
  rA: u8,
  rB: u8,
  offset: u64,
) {
  rA = u8(Math.min(12, args[0] % 16));
  rB = u8(Math.min(12, Math.floor(args[0] / 16)));
  const lX = u8(Math.min(4, Math.max(0, args.length - 1)));
  const ipOffsetRaw = u32(Z(lX, readLE(args.subarray(1, 1 + lX), lX)));
  offset = pc + ipOffsetRaw;
}

// $(0.7.1 - A.31)
export function $twoRegTwImmIxDecoder(
  args: Uint8Array,
  rA: u8,
  rB: u8,
  vX: u64,
  vY: u64,
) {
  rA = u8(Math.min(12, args[0] % 16));
  rB = u8(Math.min(12, Math.floor(args[0] / 16)));
  $notDecodableCheck!(args.length >= 2);

  const lX = u8(Math.min(4, args[1] % 8));
  const lY = u8(Math.min(4, Math.max(0, args.length - 2 - lX)));
  $notDecodableCheck!(args.length >= 2 + lX);

  vX = varint(args.subarray(2, 2 + lX));
  vY = varint(args.subarray(2 + lX, 2 + lX + lY));
}

// $(0.7.1 - A.32)
export function $threeRegIxDecoder(args: Uint8Array, rA: u8, rB: u8, rD: u8) {
  $notDecodableCheck!(args.length >= 2);
  rA = u8(Math.min(12, args[0] % 16));
  rB = u8(Math.min(12, Math.floor(args[0] / 16)));
  rD = u8(Math.min(12, args[1]));
}
