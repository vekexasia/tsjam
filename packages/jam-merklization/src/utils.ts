import { Hash } from "@tsjam/types";
import { bigintToBytes } from "@tsjam/utils";

export type HashFn = (preimage: Uint8Array) => Hash;
export const maybeBigintToBytes = (x: Uint8Array | Hash): Uint8Array =>
  typeof x === "bigint" ? bigintToBytes(x, 32) : x;
