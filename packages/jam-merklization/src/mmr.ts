import { ByteArrayOfLength, Hash } from "@tsjam/types";
import {
  HashCodec,
  JamCodec,
  OptBytesBigIntCodec,
  createArrayLengthDiscriminator,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { bigintToBytes, bytesToBigInt } from "@tsjam/utils";

/**
 * section E.2 `A`
 * $(0.5.0 - E.8)
 * @param peeks - the current MMR
 * @param newPeek - the new element to append
 * @param hashFn - the hash function
 */
export const appendMMR = <T>(
  peeks: Array<T | undefined>,
  newPeek: T,
  hashFn: (rn: T, l: T) => T,
): Array<T | undefined> => {
  return p(peeks, newPeek, 0, hashFn);
};

const p = <T>(
  peeks: Array<T | undefined>,
  newEl: T,
  pos: number,
  hashFn: (rn: T, l: T) => T,
): Array<T | undefined> => {
  if (pos >= peeks.length) {
    return peeks.slice().concat(newEl);
  } else if (pos < peeks.length && typeof peeks[pos] === "undefined") {
    return replace(peeks, pos, newEl);
  } else {
    return p(
      replace(peeks, pos, undefined),
      hashFn(peeks[pos]!, newEl),
      pos + 1,
      hashFn,
    );
  }
};

const replace = <T>(elements: T[], index: number, value: T) => {
  const toRet = elements.slice();
  toRet[index] = value;
  return toRet;
};

/**
 * $(0.5.2 - E.10)
 */
export const MMRSuperPeak = (_peeks: Array<Hash | undefined>) => {
  const peeks = _peeks
    .filter((a) => typeof a !== "undefined")
    .map((a) => bigintToBytes(a, 32));
  if (peeks.length === 0) {
    return <Hash>0n;
  }
  return bytesToBigInt<32, Hash>(innerMMRSuperPeak(peeks));
};

const NODE = new TextEncoder().encode("node");
const innerMMRSuperPeak = (
  peeks: ByteArrayOfLength<32>[],
): ByteArrayOfLength<32> => {
  if (peeks.length === 0) {
    return bigintToBytes(<Hash>0n, 32);
  }
  if (peeks.length === 1) {
    return peeks[0];
  }
  return Hashing.keccak256Buf(
    new Uint8Array([
      ...NODE,
      ...innerMMRSuperPeak(peeks.slice(0, peeks.length - 1)),
      ...peeks[peeks.length - 1],
    ]),
  );
};

/**
 * $(0.5.0 - E.9)
 */
export const MMRCodec: JamCodec<Array<Hash | undefined>> =
  createArrayLengthDiscriminator(OptBytesBigIntCodec<Hash, 32>(HashCodec));
