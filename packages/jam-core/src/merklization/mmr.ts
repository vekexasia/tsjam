import { Hashing } from "@tsjam/crypto";
import { ByteArrayOfLength, Hash } from "@tsjam/types";
import { concatUint8Arrays } from "uint8array-extras";

/**
 * section E.2 `A`
 * $(0.7.1 - E.8)
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
    const a = concatUint8Arrays([peeks[pos]!, newEl]);
    return p(replace(peeks, pos, undefined), hashFn(a), pos + 1, hashFn);
  }
};

const replace = <T>(elements: T[], index: number, value: T) => {
  const toRet = elements.slice();
  toRet[index] = value;
  return toRet;
};

/**
 * `Mr` - $(0.7.1 - E.10)
 */
export const MMRSuperPeak = (_peeks: Array<Hash | undefined>) => {
  const peeks = _peeks.filter((a) => typeof a !== "undefined");
  if (peeks.length === 0) {
    return <Hash>Buffer.alloc(32);
  }
  return <Hash>innerMMRSuperPeak(peeks);
};

const PEAK = Buffer.from(new TextEncoder().encode("peak"));
const innerMMRSuperPeak = (
  peeks: ByteArrayOfLength<32>[],
): ByteArrayOfLength<32> => {
  if (peeks.length === 0) {
    return <Hash>Buffer.alloc(32);
  }
  if (peeks.length === 1) {
    return peeks[0];
  }
  return Hashing.keccak256(
    Buffer.concat([
      PEAK,
      innerMMRSuperPeak(peeks.slice(0, peeks.length - 1)),
      peeks[peeks.length - 1],
    ]),
  );
};
