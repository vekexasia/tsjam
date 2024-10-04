import { HashFn, maybeBigintToBytes } from "@/utils.js";
import { binaryMerkleTree } from "@/binary.js";
import { Hash } from "@vekexasia/jam-types";
import { Hashing } from "@vekexasia/jam-crypto";

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
