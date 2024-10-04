import { Blake2bHash, Hash } from "@vekexasia/jam-types";
import blake2b from "blake2b-wasm";
import { keccak256 } from "keccak-wasm";
import { bytesToBigInt, toTagged } from "@vekexasia/jam-utils";
blake2b.ready((err) => {
  if (err) {
    throw err;
  }
});
export const Hashing = {
  blake2b<T extends Blake2bHash>(bytes: Uint8Array): T {
    return toTagged(bytesToBigInt(this.blake2bBuf(bytes)));
  },
  blake2bBuf(bytes: Uint8Array): Uint8Array {
    return blake2b().update(bytes).digest();
  },
  keccak256<T extends Hash>(bytes: Uint8Array): T {
    return toTagged(bytesToBigInt(keccak256(bytes)));
  },
};
