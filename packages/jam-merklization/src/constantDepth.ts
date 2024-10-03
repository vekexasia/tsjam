// E.1.2
import { HashFn } from "@/utils.js";
import { binaryMerkleTree, traceBinaryMerkleTree } from "@/binary.js";

const leaf: Uint8Array = new TextEncoder().encode("leaf");

/**
 * (299) `M`
 */
export const constantDepthBinaryTree = (
  elements: Uint8Array[],
  hashFn: HashFn,
): Uint8Array => {
  return binaryMerkleTree(C_fn(elements, hashFn), hashFn);
};

const C_fn = (elements: Uint8Array[], hashFn: HashFn): ReturnType<HashFn>[] => {
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
  hashFn: HashFn,
): ReturnType<HashFn>[] => {
  return traceBinaryMerkleTree(C_fn(elements, hashFn), index, hashFn);
};

export const J_N_sub = (
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn,
  x: number,
): ReturnType<HashFn>[] => {
  return traceBinaryMerkleTree(C_fn(elements, hashFn), index, hashFn).slice(
    0,
    Math.max(0, Math.ceil(Math.log2(Math.max(1, elements.length)) - x)),
  );
};
