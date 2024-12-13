import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import {
  BandersnatchKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  BigIntBytes,
  Blake2bHash,
  ByteArrayOfLength,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MerkeTreeRoot,
  OpaqueHash,
  WorkPackageHash,
} from "@tsjam/types";
import { bigintToExistingBytes, bytesToBigInt } from "@tsjam/utils";

// $(0.5.0 - C.2)
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

export const fixedSizeIdentityCodec = <
  T extends number,
  X extends ByteArrayOfLength<T> = ByteArrayOfLength<T>,
>(
  size: T,
): JamCodec<X> => {
  return {
    decode(bytes: Uint8Array) {
      return { value: bytes.subarray(0, size) as X, readBytes: size };
    },
    encode(value: Uint8Array, bytes: Uint8Array): number {
      bytes.set(value);
      return value.length;
    },
    encodedSize(): number {
      return size;
    },
  };
};

export const GenericBytesBigIntCodec = <
  K extends BigIntBytes<T>,
  T extends number,
>(
  num: T,
): JamCodec<K> => ({
  decode(bytes: Uint8Array): { value: K; readBytes: number } {
    return {
      value: bytesToBigInt(
        bytes.subarray(0, num) as unknown as ByteArrayOfLength<T>,
      ),
      readBytes: num,
    };
  },
  encode(value: K, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= num,
      `GenericBytesBigIntCodec: invalid length. Expected ${num} bytes, was ${bytes.length}`,
    );
    bigintToExistingBytes(value, bytes.subarray(0, num));
    return num;
  },
  encodedSize(): number {
    return num;
  },
});

export const HashCodec = GenericBytesBigIntCodec<Hash, 32>(32);
export const WorkPackageHashCodec = GenericBytesBigIntCodec<
  WorkPackageHash,
  32
>(32);
export const Blake2bHashCodec = GenericBytesBigIntCodec<Blake2bHash, 32>(32);
export const OpaqueHashCodec = GenericBytesBigIntCodec<OpaqueHash, 32>(32);
export const MerkleTreeRootCodec = GenericBytesBigIntCodec<MerkeTreeRoot, 32>(
  32,
);
// they share the same properties but the errors are different
export const Ed25519PubkeyCodec = GenericBytesBigIntCodec<ED25519PublicKey, 32>(
  32,
);
export const BandersnatchCodec = GenericBytesBigIntCodec<BandersnatchKey, 32>(
  32,
);
export const BandersnatchSignatureCodec = GenericBytesBigIntCodec<
  BandersnatchSignature,
  96
>(96);
export const Ed25519SignatureCodec = GenericBytesBigIntCodec<
  ED25519Signature,
  64
>(64);

export const BandersnatchRingRootCodec = GenericBytesBigIntCodec<
  BandersnatchRingRoot,
  144
>(144);
