import { CORES, NUMBER_OF_VALIDATORS } from "@/consts.js";

declare const tags: unique symbol;
export type Tagged<
  BaseType,
  Tag extends PropertyKey,
  Metadata = void,
> = BaseType & {
  [tags]: { [K in Tag]: Metadata };
};
export type u8 = Tagged<number, "u8", { minValue: 0; maxValue: 255 }>;
export type u16 = Tagged<number, "u16", { minValue: 0; maxValue: 65535 }>;
export type u32 = Tagged<number, "u32", { minValue: 0; maxValue: 4294967295 }>;
export type u64 = Tagged<
  bigint,
  "u64",
  { minValue: 0n; maxValue: 1844674407370955161n }
>;

export type ByteArrayOfLength<T extends number> = Tagged<
  Uint8Array,
  `ByteArrayOfLength${T}`,
  { byteLength: T }
>;

export type ByteArray32 = ByteArrayOfLength<32>;
export type ByteArray64 = ByteArrayOfLength<64>;
export type BandersnatchKey = Tagged<ByteArray32, "BandersnatchKey">;
export type Hash = Tagged<ByteArray32, "Hash">;
export type MerkeTreeRoot = Tagged<ByteArray32, "MerkleTreeRoot">;
export type OpaqueHash = Tagged<Hash, "OpaqueHash">;
export type ED25519PublicKey = Tagged<ByteArray32, "ED25519PublicKey">;
export type ED25519Signature = Tagged<ByteArray64, "ED25519Signature">;
export type BLSKey = Tagged<ByteArrayOfLength<144>, "BLSKey">;
export type RingVRFProof = Tagged<ByteArrayOfLength<784>, "RingVRFProof">;

// Sequences
/**
 * Defines type of a sequence having up to L elements
 */
export type UpToSeq<
  T,
  L extends number,
  Tag extends string = `UpToSeq${L}`,
> = Tagged<T[], Tag, { maxLength: L }>;
/**
 * Defines type of a sequnce having exactly L elements
 */
export type SeqOfLength<
  T,
  L extends number,
  Tag extends string = `UpToSeq${L}`,
> = Tagged<T[], Tag, { length: L }>;

export type MinSeqLength<
  T,
  L extends number,
  Tag extends string = `UpToSeq${L}`,
> = Tagged<T[], Tag, { minLength: L }>;

export type BoundedSeq<
  T,
  Min extends number,
  Max extends number,
  Tag extends string = `BoundedSeq${Min}-${Max}`,
> = Tagged<T[], Tag, { minLength: Min; maxLength: Max }>;

export type CoreIndex = Tagged<number, "CoreIndex", { maxValue: typeof CORES }>;
export type ValidatorIndex = Tagged<
  number,
  "ValidatorIndex",
  { maxValue: typeof NUMBER_OF_VALIDATORS }
>;
