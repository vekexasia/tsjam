// E.1.2
import { HashFn } from "@/utils.js";
import { binaryMerkleTree, traceBinaryMerkleTree } from "@/binary.js";
import { Hashing } from "@tsjam/crypto";
import { Hash } from "@tsjam/types";

const leaf: Uint8Array = new TextEncoder().encode("leaf");

/**
 * `M`
 * $(0.5.4 - E.4)
 */
export const constantDepthBinaryTree = (
  elements: Uint8Array[],
  hashFn: HashFn = Hashing.blake2b,
): Hash => {
  return binaryMerkleTree(C_fn(elements, hashFn), hashFn);
};

/**
 * $(0.5.4 - E.5)
 */
export const J_fn = (
  x: number,
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn = Hashing.blake2b,
): ReturnType<HashFn>[] => {
  return traceBinaryMerkleTree(
    C_fn(elements, hashFn),
    2 ** index,
    hashFn,
  ).slice(
    0,
    Math.max(0, Math.ceil(Math.log2(Math.max(1, elements.length)) - x)),
  );
};

/**
 * `L` - leaves
 * $(0.5.4 - E.6)
 * @param x - slice
 * @param elements - elements
 * @param index - the index to trace
 * @param hashFn - the hashing fn
 */
export const L_fn = (
  x: number,
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn = Hashing.blake2b,
): ReturnType<HashFn>[] => {
  const toRet: ReturnType<HashFn>[] = [];
  const twoOverX = 2 ** x;
  for (
    let i = twoOverX * index;
    i < twoOverX * index + twoOverX && i < elements.length;
    i++
  ) {
    toRet.push(hashFn(new Uint8Array([...leaf, ...elements[i]])));
  }
  return toRet;
};

/**
 * `C` function
 * $(0.5.4 - E.7)
 * hashes all data and pads the array to the next power of 2
 * @param elements - preimage elements
 * @param hashFn - the hashing function
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
