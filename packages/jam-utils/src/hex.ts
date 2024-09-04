import { bytesToBigInt } from "@/bigint_bytes.js";

export const hexToBytes = (hex: string): Uint8Array => {
  return Buffer.from(hex.slice(2), "hex");
};
export const hextToBigInt = <T extends bigint>(hex: string): T => {
  return bytesToBigInt(hexToBytes(hex)) as unknown as T;
};
