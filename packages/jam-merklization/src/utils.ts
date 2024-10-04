import { Hash } from "@vekexasia/jam-types";
import { bigintToBytes } from "@vekexasia/jam-utils";

export type HashFn = (preimage: Uint8Array) => Hash;
export const maybeBigintToBytes = (x: Uint8Array | Hash): Uint8Array =>
  typeof x === "bigint" ? bigintToBytes(x, 32) : x;
