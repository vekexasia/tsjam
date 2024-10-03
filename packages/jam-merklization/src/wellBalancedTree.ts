import { HashFn } from "@/utils.js";
import { binaryMerkleTree } from "@/binary.js";

/**
 * (297) `Mb`
 */
export const wellBalancedTree = (
  elements: Uint8Array[],
  hashFn: HashFn,
): Uint8Array => {
  if (elements.length === 1) {
    return hashFn(elements[0]);
  } else {
    return binaryMerkleTree(elements, hashFn);
  }
};
