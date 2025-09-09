import { Blake2bHash, Hash } from "@tsjam/types";
import blake2b from "blake2b-wasm";
import { keccak256 } from "keccak-wasm";
blake2b.ready((err) => {
  if (err) {
    throw err;
  }
});
export const Hashing = {
  blake2b<T extends Blake2bHash>(bytes: Uint8Array): T {
    const r = blake2b().update(bytes).digest();
    return <T>(<Blake2bHash>Buffer.from(r.buffer, r.byteOffset, r.byteLength));
  },
  keccak256<T extends Hash>(bytes: Uint8Array): T {
    const r = keccak256(bytes);
    return <T>(<Hash>Buffer.from(r.buffer, r.byteOffset, r.byteLength));
  },
};
