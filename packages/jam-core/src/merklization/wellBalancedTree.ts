import { Hashing } from "@tsjam/crypto";
import { Hash } from "@tsjam/types";
import { binaryMerkleTree } from "./binary";
import { HashFn } from "./utils";
import { encodeWithCodec, HashCodec } from "@tsjam/codec";

/**
 * $(0.7.1 - E.3)
 */
export const wellBalancedTree = <T extends Uint8Array | Hash>(
  elements: T[],
  hashFn: HashFn = Hashing.blake2b,
): Hash => {
  if (elements.length === 1) {
    if (typeof elements[0] === "bigint") {
      // its an hash
      return Hashing.blake2b(encodeWithCodec(HashCodec, elements[0]));
    }
    return hashFn(elements[0]);
  } else {
    return binaryMerkleTree(elements, hashFn) as Hash;
  }
};
