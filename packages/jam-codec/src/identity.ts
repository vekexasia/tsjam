import { JamCodec } from "@/codec.js";
import assert from "node:assert";
import {
  BandersnatchKey,
  BandersnatchRingRoot,
  BandersnatchSignature,
  BigIntBytes,
  Blake2bHash,
  ByteArrayOfLength,
  CodeHash,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MerkleTreeRoot,
  OpaqueHash,
  WorkPackageHash,
} from "@tsjam/types";
import { bigintToExistingBytes, bytesToBigInt } from "@tsjam/utils";

// $(0.6.4 - C.2)
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
  X extends ByteArrayOfLength<T>,
  T extends number,
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

const genericBytesBigIntCodec = <K extends BigIntBytes<T>, T extends number>(
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

export const create32BCodec = <T extends BigIntBytes<32>>() =>
  genericBytesBigIntCodec<T, 32>(32);

export const HashCodec = create32BCodec<Hash>();
export const CodeHashCodec = create32BCodec<CodeHash>();
export const WorkPackageHashCodec = create32BCodec<WorkPackageHash>();
export const Blake2bHashCodec = create32BCodec<Blake2bHash>();
export const OpaqueHashCodec = create32BCodec<OpaqueHash>();
export const MerkleTreeRootCodec = create32BCodec<MerkleTreeRoot>();
const Ed25519PubkeyBufCodec = fixedSizeIdentityCodec<
  ED25519PublicKey["buf"],
  32
>(32);
export const Ed25519PubkeyBigIntCodec = genericBytesBigIntCodec<
  ED25519PublicKey["bigint"],
  32
>(32);
export const Ed25519PubkeyCodec: JamCodec<ED25519PublicKey> = {
  encode(value, bytes) {
    return Ed25519PubkeyBufCodec.encode(value.buf, bytes.subarray(0, 32));
  },
  decode(bytes) {
    const { value: buf, readBytes } = Ed25519PubkeyBufCodec.decode(
      bytes.subarray(0, 32),
    );
    return {
      value: {
        buf,
        bigint: Ed25519PubkeyBigIntCodec.decode(bytes.subarray(0, 32)).value,
      },
      readBytes,
    };
  },
  encodedSize() {
    return 32;
  },
};

export const BandersnatchCodec = fixedSizeIdentityCodec<BandersnatchKey, 32>(
  32,
);
export const BandersnatchSignatureCodec = fixedSizeIdentityCodec<
  BandersnatchSignature,
  96
>(96);
export const Ed25519SignatureCodec = fixedSizeIdentityCodec<
  ED25519Signature,
  64
>(64);

export const BandersnatchRingRootCodec = fixedSizeIdentityCodec<
  BandersnatchRingRoot,
  144
>(144);
