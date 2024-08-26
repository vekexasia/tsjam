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

export type i32 = Tagged<
  number,
  "i32",
  { minValue: -2147483648; maxValue: 2147483648 }
>;

export type ByteArrayOfLength<T extends number> = Tagged<
  Uint8Array,
  `ByteArrayOfLength${T}`,
  { byteLength: T }
>;

/**
 * Define a bigint whose max value is 2^(8*T) - 1 (if unsigned)
 * it's used for all the keys (as they can literally be a number) and hashes
 **/
export type BigIntBytes<T extends number> = Tagged<bigint, `BigIntBytes${T}`>;

export type BandersnatchKey = Tagged<BigIntBytes<32>, "BandersnatchKey">;
export type BandersnatchPrivKey = Tagged<
  BigIntBytes<64>,
  "BandersnatchPrivKey"
>;
export type Hash = Tagged<BigIntBytes<32>, "Hash">;
export type Blake2bHash = Tagged<BigIntBytes<32>, "Blake2bHash">;
export type MerkeTreeRoot = Tagged<BigIntBytes<32>, "MerkleTreeRoot">;
export type OpaqueHash = Tagged<Hash, "OpaqueHash">;
export type ED25519PublicKey = Tagged<BigIntBytes<32>, "ED25519PublicKey">;
export type ED25519PrivateKey = Tagged<BigIntBytes<64>, "ED25519PrivateKey">;
export type ED25519Signature = Tagged<BigIntBytes<64>, "ED25519Signature">;
export type BandersnatchSignature = Tagged<
  BigIntBytes<64>,
  "BandersnatchSignature"
>;
export type BandersnatchRingRoot = Tagged<
  BigIntBytes<144>,
  "BandersnatchRingRoot"
>;
export type BLSKey = Tagged<ByteArrayOfLength<144>, "BLSKey">;
/**
 * defined in section 3.8.2 and appendix G
 * set is `F` in the graypaper
 */
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
export type ServiceIndex = Tagged<u32, "ServiceIndex">;

export type Posterior<T> = Tagged<T, "Posterior">;
export type Dagger<T> = Tagged<T, "Dagger">;
export type DoubleDagger<T> = Tagged<T, "DoubleDagger">;

export type UnTagged<T> =
  T extends Tagged<number, never, never>
    ? number
    : T extends Tagged<bigint, never, never>
      ? bigint
      : T extends Tagged<(infer El)[], never, never>
        ? El[]
        : T extends Tagged<infer X, never, never>
          ? Omit<X, typeof tags>
          : T;
export type UnTaggedObject<T> = {
  [K in keyof UnTagged<T>]: UnTagged<T>[K] extends Tagged<
    infer X,
    infer name,
    infer meta
  >
    ? UnTagged<X>
    : UnTagged<T>[K];
};
/**
 * simple utility function to go from untagged to tagged
 */
export const toTagged = <K, Tag extends PropertyKey, Metadata>(
  value: K,
): Tagged<K, Tag, Metadata> => {
  return value as Tagged<K, Tag, Metadata>;
};

export const toDagger = <T>(value: T): Dagger<T> => {
  return toTagged(value);
};

export const toDoubleDagger = <T>(value: Dagger<T>): DoubleDagger<T> => {
  return toTagged(value);
};

export const toPosterior = <T>(
  value: Dagger<T> | DoubleDagger<T> | T,
): Posterior<T> => {
  return toTagged(value);
};
