import { HashFn, maybeBigintToBytes } from "@/utils.js";
import { binaryMerkleTree } from "@/binary.js";
import { Hash } from "@tsjam/types";
import { Hashing } from "@tsjam/crypto";

/**
 * (298) `Mb`
 */
export const wellBalancedTree = <T extends Uint8Array | Hash>(
  elements: T[],
  hashFn: HashFn = Hashing.blake2b,
): Hash => {
  if (elements.length === 1) {
    return hashFn(maybeBigintToBytes(elements[0]));
  } else {
    return binaryMerkleTree(elements, hashFn) as Hash;
  }
};
