import { Hash } from "@vekexasia/jam-types";
import {
  JamCodec,
  OptHashCodec,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";

/**
 * section E.2 (301) `A`
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

export const MMRCodec: JamCodec<Array<Hash | undefined>> =
  createArrayLengthDiscriminator(OptHashCodec);
