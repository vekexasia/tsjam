import { MerkeTreeRoot } from "@vekexasia/jam-types";
import { bytesToBigInt } from "@vekexasia/jam-utils";
import assert from "node:assert";
import { HashFn } from "@/utils.js";

const prefix: Uint8Array = new TextEncoder().encode("node");

export const binaryMerkleTree = (
  elements: Uint8Array[],
  hashFn: HashFn,
): Uint8Array => {
  if (elements.length === 0) {
    return new Uint8Array(32).fill(0);
  }
  if (elements.length === 1) {
    return elements[0];
  }
  const mid = Math.ceil(elements.length / 2);
  const buf = new Uint8Array([
    ...prefix,
    ...binaryMerkleTree(elements.slice(0, mid), hashFn),
    ...binaryMerkleTree(elements.slice(mid), hashFn),
  ]);
  return hashFn(buf);
};

const P_sup = (v: Uint8Array[], i: number, sup: boolean): Uint8Array[] => {
  if (i < Math.ceil(v.length / 2) == sup) {
    return v.slice(0, Math.ceil(v.length / 2));
  } else {
    return v.slice(Math.ceil(v.length / 2));
  }
};

/**
 * (297) `T`
 * @param elements the elements to trace from
 * @param index the index of the element
 * @param hashFn the hashfn
 * @returns each opposite node from top to bottom as the tree is the navigated to arrive at the leaf
 */
export const traceBinaryMerkleTree = (
  elements: Uint8Array[],
  index: number,
  hashFn: HashFn,
): Uint8Array[] => {
  assert(index >= 0 && index < elements.length, "Index out of bounds");
  if (elements.length === 0) {
    return [];
  }
  const pi =
    index < Math.ceil(elements.length / 2) ? 0 : Math.ceil(elements.length / 2);
  return [
    binaryMerkleTree(P_sup(elements, index, false), hashFn), // opposite node
    ...traceBinaryMerkleTree(P_sup(elements, index, true), index - pi, hashFn),
  ];
};

export const wellBalancedBinaryMerkleRoot = (
  elements: Uint8Array[],
  hashFn: (preimage: Uint8Array) => Uint8Array,
): MerkeTreeRoot => {
  if (elements.length === 1) {
    return bytesToBigInt(hashFn(elements[0]));
  }
  return bytesToBigInt(binaryMerkleTree(elements, hashFn));
};
