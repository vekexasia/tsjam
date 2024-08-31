import { MerkeTreeRoot } from "@vekexasia/jam-types";
import { bytesToBigInt } from "@vekexasia/jam-codec";

const prefix: Uint8Array = new TextEncoder().encode("node");

export const binaryMerkleTree = (
  elements: Uint8Array[],
  hashFn: (preimage: Uint8Array) => Uint8Array,
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

export const wellBalancedBinaryMerkleRoot = (
  elements: Uint8Array[],
  hashFn: (preimage: Uint8Array) => Uint8Array,
): MerkeTreeRoot => {
  if (elements.length === 1) {
    return bytesToBigInt(hashFn(elements[0]));
  }
  return bytesToBigInt(binaryMerkleTree(elements, hashFn));
};
