import { Hashing } from "@tsjam/crypto";
import { Hash } from "@tsjam/types";
import { binaryMerkleTree } from "./binary";
import { HashFn } from "./utils";

/**
 * $(0.7.1 - E.3)
 */
export const wellBalancedTree = <T extends Buffer | Hash>(
  elements: T[],
  hashFn: HashFn = Hashing.blake2b,
): Hash => {
  if (elements.length === 1) {
    return hashFn(elements[0]);
  } else {
    return binaryMerkleTree(elements, hashFn) as Hash;
  }
};
