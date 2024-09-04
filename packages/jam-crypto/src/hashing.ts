import { Blake2bHash } from "@vekexasia/jam-types";
import blake2b from "blake2b-wasm";
import { keccak256 } from "keccak-wasm";
import { bytesToBigInt, toTagged } from "@vekexasia/jam-utils";
blake2b.ready((err) => {
  if (err) {
    throw err;
  }
});
export const Hashing = {
  blake2b(bytes: Uint8Array): Blake2bHash {
    return toTagged(bytesToBigInt(this.blake2bBuf(bytes)));
  },
  blake2bBuf(bytes: Uint8Array): Uint8Array {
    return blake2b().update(bytes).digest();
  },
  keccak256(bytes: Uint8Array): Uint8Array {
    return keccak256(bytes);
  },
};
