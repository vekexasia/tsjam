import { uncheckedConverter } from "@vekexasia/bigint-uint8array";
import { BigIntBytes } from "@vekexasia/jam-types";

/**
 * Utility to convert a BigInt to a Uint8Array
 * @param value - the value to convert
 * @param nBytes - the number of bytes to use
 */
export const bigintToBytes = <T extends number>(
  value: BigIntBytes<T>,
  nBytes: T,
): Uint8Array => {
  return uncheckedConverter.bigEndianToNewArray(value, nBytes);
};

export const bigintToExistingBytes = <T extends number>(
  value: BigIntBytes<T>,
  bytes: Uint8Array,
): T => {
  // note: we do not check if the length of the array is enough
  uncheckedConverter.bigEndianToArray(value, bytes);
  return bytes.length as T;
};

/**
 * Utility to convert a Uint8Array to a BigInt
 * @param bytes - the Uint8Array to convert
 */
export const bytesToBigInt = <K extends number, T extends BigIntBytes<K>>(
  bytes: Uint8Array,
): T => {
  return uncheckedConverter.arrayToBigEndian(bytes) as T;
};
