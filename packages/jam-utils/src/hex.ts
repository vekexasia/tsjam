import { bytesToBigInt } from "@/bigint_bytes.js";

/**
 * Convert a Uint8Array to a hex string
 * @param bytes - the Uint8Array to convert
 */
export const hexToBytes = (hex: string): Uint8Array => {
  return new Uint8Array([...Buffer.from(hex.slice(2), "hex")]);
};

/**
 * Convert a hex string to a BigInt
 * @param hex - the hex string to convert
 * @returns the BigInt
 */
export const hextToBigInt = <T extends bigint>(hex: string): T => {
  return bytesToBigInt(hexToBytes(hex)) as unknown as T;
};
