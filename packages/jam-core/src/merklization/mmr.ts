import { ByteArrayOfLength, Hash } from "@tsjam/types";
import {
  HashCodec,
  JamCodec,
  OptBytesBigIntCodec,
  createArrayLengthDiscriminator,
  encodeWithCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";

/**
 * section E.2 `A`
 * $(0.6.4 - E.8)
 * @param peeks - the current MMR
 * @param newPeek - the new element to append
 * @param hashFn - the hash function
 */
export const appendMMR = <T extends Hash>(
  peeks: Array<T | undefined>,
  newPeek: T,
  hashFn: (el: Uint8Array) => T,
): Array<T | undefined> => {
  return p(peeks, newPeek, 0, hashFn);
};

const p = <T extends Hash>(
  peeks: Array<T | undefined>, // r
  newEl: T, // l
  pos: number, // n
  hashFn: (el: Uint8Array) => T, // H
): Array<T | undefined> => {
  if (pos >= peeks.length) {
    return peeks.slice().concat(newEl);
  } else if (pos < peeks.length && typeof peeks[pos] === "undefined") {
    return replace(peeks, pos, newEl);
  } else {
    const a = new Uint8Array(32 * 2);
    HashCodec.encode(peeks[pos]!, a.subarray(0, 32));
    HashCodec.encode(newEl, a.subarray(32, 64));
    return p(replace(peeks, pos, undefined), hashFn(a), pos + 1, hashFn);
  }
};

const replace = <T>(elements: T[], index: number, value: T) => {
  const toRet = elements.slice();
  toRet[index] = value;
  return toRet;
};

/**
 * `Mr` - $(0.6.7 - E.10)
 */
export const MMRSuperPeak = (_peeks: Array<Hash | undefined>) => {
  const peeks = _peeks
    .filter((a) => typeof a !== "undefined")
    .map((a) => <ByteArrayOfLength<32>>encodeWithCodec(HashCodec, a));
  if (peeks.length === 0) {
    return <Hash>0n;
  }
  return HashCodec.decode(innerMMRSuperPeak(peeks)).value;
};

const PEAK = new TextEncoder().encode("peak");
const innerMMRSuperPeak = (
  peeks: ByteArrayOfLength<32>[],
): ByteArrayOfLength<32> => {
  if (peeks.length === 0) {
    return <ByteArrayOfLength<32>>encodeWithCodec(HashCodec, <Hash>0n);
  }
  if (peeks.length === 1) {
    return peeks[0];
  }
  return Hashing.keccak256Buf(
    new Uint8Array([
      ...PEAK,
      ...innerMMRSuperPeak(peeks.slice(0, peeks.length - 1)),
      ...peeks[peeks.length - 1],
    ]),
  );
};

/**
 * $(0.6.4 - E.9)
 */
export const MMRCodec: JamCodec<Array<Hash | undefined>> =
  createArrayLengthDiscriminator(OptBytesBigIntCodec<Hash, 32>(HashCodec));
