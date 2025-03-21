import { bytesToBigInt } from "@/bigint_bytes.js";
import { BigIntBytes, ByteArrayOfLength } from "@tsjam/types";

/**
 * Convert a Uint8Array to a hex string
 * @param bytes - the Uint8Array to convert
 * TODO: remove
 */
export const hexToBytes = <T extends ByteArrayOfLength<K>, K extends number>(
  hex: string,
): T => {
  return <T>new Uint8Array([...Buffer.from(hex.slice(2), "hex")]);
};

/**
 * Convert a hex string to a BigInt
 * @param hex - the hex string to convert
 * @returns the BigInt
 * TODO: remove
 */
export const hextToBigInt = <T extends BigIntBytes<K>, K extends number>(
  hex: string,
): T => {
  return bytesToBigInt(hexToBytes(hex)) as unknown as T;
};
