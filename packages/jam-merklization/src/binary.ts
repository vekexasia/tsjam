import { Hash, MerkleTreeRoot } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";
import { HashFn, maybeBigintToBytes } from "@/utils.js";
import { Hashing } from "@tsjam/crypto";

const prefix: Uint8Array = new TextEncoder().encode("node");

/**
 * $(0.6.1 - E.1)
 */
export const binaryMerkleTree = <T extends Uint8Array | Hash>(
  elements: T[],
  hashFn: HashFn = Hashing.blake2b,
): T | Hash => {
  if (elements.length === 0) {
    return 0n as Hash;
  }
  if (elements.length === 1) {
    return elements[0];
  }
  const mid = Math.ceil(elements.length / 2);
  const buf = new Uint8Array([
    ...prefix,
    ...maybeBigintToBytes(binaryMerkleTree(elements.slice(0, mid), hashFn)),
    ...maybeBigintToBytes(binaryMerkleTree(elements.slice(mid), hashFn)),
  ]);
  return hashFn(buf);
};

const P_sup = <T extends Uint8Array | Hash>(
  v: T[],
  i: number,
  sup: boolean,
): T[] => {
  if (i < Math.ceil(v.length / 2) == sup) {
    return v.slice(0, Math.ceil(v.length / 2)) as T[];
  } else {
    return v.slice(Math.ceil(v.length / 2)) as T[];
  }
};

/**
 * `T`
 * $(0.6.1 - E.2)
 * @param elements - the elements to trace from
 * @param index - the index of the element
 * @param hashFn - the hashfn
 * @returns each opposite node from top to bottom as the tree is the navigated to arrive at the leaf
 */
export const traceBinaryMerkleTree = <T extends Uint8Array | Hash>(
  elements: T[],
  index: number,
  hashFn: HashFn = Hashing.blake2b,
): (T | Hash)[] => {
  assert(index >= 0 && index < elements.length, "Index out of bounds");
  if (elements.length === 0) {
    return [];
  }
  const pi =
    index < Math.ceil(elements.length / 2) ? 0 : Math.ceil(elements.length / 2);
  return [
    binaryMerkleTree<T>(P_sup(elements, index, false), hashFn), // opposite node
    ...traceBinaryMerkleTree<T>(
      P_sup(elements, index, true),
      index - pi,
      hashFn,
    ),
  ];
};

/**
 * `Mb`
 * $(0.6.1 - E.3)
 */
export const wellBalancedBinaryMerkleRoot = (
  elements: (Hash | Uint8Array)[],
  hashFn: HashFn = Hashing.blake2b,
): MerkleTreeRoot => {
  if (elements.length === 1) {
    return toTagged(hashFn(maybeBigintToBytes(elements[0])));
  }
  // we are sure it returns Hash as the only reason binaryMerkleTree returns Uint8Array is when elements.length === 1
  // which is the case above.
  return toTagged(binaryMerkleTree(elements, hashFn) as Hash);
};
