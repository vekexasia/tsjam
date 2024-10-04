// E.1.2
import { HashFn } from "@/utils.js";
import { binaryMerkleTree, traceBinaryMerkleTree } from "@/binary.js";
import { Hashing } from "@vekexasia/jam-crypto";
import { Hash } from "@vekexasia/jam-types";

const leaf: Uint8Array = new TextEncoder().encode("leaf");

/**
 * (299) `M`
 */
export const constantDepthBinaryTree = (
  elements: Uint8Array[],
  hashFn: HashFn = Hashing.blake2b,
): Hash => {
  return binaryMerkleTree(C_fn(elements, hashFn), hashFn);
};

/**
 * (302) `C` function
 * hashes all data and pads the array to the next power of 2
 * @param elements - preimage elements
 * @param hashFn - the hashing function
 * @constructor
 */
const C_fn = (
  elements: Uint8Array[],
  hashFn: HashFn = Hashing.blake2b,
): ReturnType<HashFn>[] => {
  const nEl = Math.pow(2, Math.ceil(Math.log2(Math.max(1, elements.length))));
  // create with padding
  const toRet: ReturnType<HashFn>[] = new Array(nEl).fill(
    new Uint8Array(32).fill(0),
  );
  for (let i = 0; i < elements.length; i++) {
    toRet.push(hashFn(new Uint8Array([...leaf, ...elements[i]])));
  }
  return toRet;
};

export const J_fn = (
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn = Hashing.blake2b,
): ReturnType<HashFn>[] => {
  return traceBinaryMerkleTree(C_fn(elements, hashFn), index, hashFn);
};

/**
 * (301) `J_subx`
 * @param x - slice
 * @param elements - elements
 * @param index - the index to trace
 * @param hashFn - the hashing fn
 */
export const traceBinarySliced = (
  x: number,
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn = Hashing.blake2b,
): ReturnType<HashFn>[] => {
  return traceBinaryMerkleTree(C_fn(elements, hashFn), index, hashFn).slice(
    0,
    Math.max(0, Math.ceil(Math.log2(Math.max(1, elements.length)) - x)),
  );
};
