import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import {
  BandersnatchKey,
  BigIntBytes,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MerkeTreeRoot,
  OpaqueHash,
} from "@vekexasia/jam-types";
import { bigintToExistingBytes, bytesToBigInt } from "@/bigint_bytes.js";

export const IdentityCodec: JamCodec<Uint8Array> = {
  decode(bytes: Uint8Array): { value: Uint8Array; readBytes: number } {
    return { value: bytes, readBytes: bytes.length };
  },
  encode(value: Uint8Array, bytes: Uint8Array): number {
    bytes.set(value);
    return value.length;
  },
  encodedSize(value: Uint8Array): number {
    return value.length;
  },
};

const Generic32BytesBigIntCodec = <K extends BigIntBytes<T>, T extends number>(
  num: T,
): JamCodec<K> => ({
  decode(bytes: Uint8Array): { value: K; readBytes: number } {
    // note: using slice is a performance hit. we could subarray which refers to the same memory region but
    // we do not want to make any assumption on the caller's behavior
    return { value: bytesToBigInt(bytes.slice(0, num)), readBytes: num };
  },
  encode(value: K, bytes: Uint8Array): number {
    assert.ok(
      bytes.length === num,
      `GenericBytesBigIntCodec: invalid length. Expected ${num} bytes`,
    );
    bigintToExistingBytes(value, bytes);
    return num;
  },
  encodedSize(): number {
    return num;
  },
});

export const HashCodec = Generic32BytesBigIntCodec<Hash, 32>(32);
export const OpaqueHashCodec = Generic32BytesBigIntCodec<OpaqueHash, 32>(32);
export const MerkleTreeRootCodec = Generic32BytesBigIntCodec<MerkeTreeRoot, 32>(
  32,
);
// they share the same properties but the errors are different
export const PublicKeyCodec = Generic32BytesBigIntCodec<ED25519PublicKey, 32>(
  32,
);
export const Ed25519SignatureCodec = Generic32BytesBigIntCodec<
  ED25519Signature,
  64
>(64);
export const Ed25519PubkeyCodec = Generic32BytesBigIntCodec<
  ED25519PublicKey,
  32
>(32);
export const BandersnatchCodec = Generic32BytesBigIntCodec<BandersnatchKey, 32>(
  32,
);
