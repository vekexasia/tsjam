import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";

declare const tags: unique symbol;
export type Tagged<
  BaseType,
  Tag extends PropertyKey,
  Metadata = void,
> = BaseType & {
  [tags]: { [K in Tag]: Metadata };
};
export type u8 = Tagged<number, "u8">;
export type u16 = Tagged<number, "u16">;
export type u24 = Tagged<number, "u24">;
export type u32 = Tagged<number, "u32">;
export type i64 = Tagged<bigint, "i64">;
export type u64 = Tagged<bigint, "u64">;

export type i32 = Tagged<number, "i32">;

export type ByteArrayOfLength<T extends number> = Tagged<
  Uint8Array,
  `ByteArrayOfLength${T}`
>;

/**
 * $(0.6.4 - 4.21)
 * Balance is a 64-bit unsigned integer
 */
export type Balance = Tagged<u64, "balance">;

/**
 * $(0.6.4 - 4.23)
 * Gas is a 64-bit unsigned integer
 */
export type Gas = Tagged<u64, "gas">;

/**
 * $(0.6.4 - 4.23)
 * Z_Gas is a 64-bit signed integer
 */
export type Z_Gas = Tagged<i64, "gas">;

/**
 * $(0.6.4 - 4.23)
 * Defines the value held by a register
 * RegisterValue is a 64-bit unsigned integer
 */
export type RegisterValue = Tagged<u64, "registerValue">;

/**
 * Define a bigint whose max value is 2^(8*T) - 1 (if unsigned)
 * it's used for all the keys (as they can literally be a number) and hashes
 **/
export type BigIntBytes<T extends number> = Tagged<bigint, `BigIntBytes${T}`>;

/**
 * Both public and private keys are 32 bytes long
 */
export type BandersnatchKey = Tagged<ByteArrayOfLength<32>, "BandersnatchKey">;
export type Hash = Tagged<BigIntBytes<32>, "Hash">;
export type AuthorizerHash = Tagged<Hash, "AuthorizerHash">;
export type CodeHash = Tagged<Hash, "CodeHash">;
export type Blake2bHash = Tagged<Hash, "Blake2bHash">;
export type HeaderHash = Tagged<Blake2bHash, "HeaderHash">;
export type BeefyRootHash = Tagged<Blake2bHash, "BeefyRootHash">;
export type MerkleTreeRoot = Tagged<Blake2bHash, "MerkleTreeRoot">;
export type StateRootHash = Tagged<MerkleTreeRoot, "StateRootHash">;
export type OpaqueHash = Tagged<Hash, "OpaqueHash">;
export type WorkPackageHash = Tagged<Blake2bHash, "WorkPackageHash">;
/**
 *  `H⊞`
 */
export type ExportingWorkPackageHash = { value: WorkPackageHash };
export type ED25519PublicKey = Tagged<BigIntBytes<32>, "ED25519PublicKey">;
export type ED25519PrivateKey = Tagged<BigIntBytes<64>, "ED25519PrivateKey">;
export type ED25519Signature = Tagged<BigIntBytes<64>, "ED25519Signature">;
export type BandersnatchSignature = Tagged<
  BigIntBytes<96>,
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
> = Tagged<T[], Tag | `UpToSeq${L}`, { maxLength: L }>;
/**
 * Defines type of a sequnce having exactly L elements
 */
export type SeqOfLength<
  T,
  L extends number,
  Tag extends string = `Seq${L}`,
> = Tagged<T[], Tag | `Seq${L}`, { length: L }>;

export type MinSeqLength<
  T,
  L extends number,
  Tag extends string = `UpToSeq${L}`,
> = Tagged<T[], Tag | `UpToSeq${L}`, { minLength: L }>;

export type BoundedSeq<
  T,
  Min extends number,
  Max extends number,
  Tag extends string = `BoundedSeq${Min}-${Max}`,
> = Tagged<
  T[],
  Tag | `BoundedSeq${Min}-${Max}`,
  { minLength: Min; maxLength: Max }
>;

/**
 * Index of a core
 * unsigned 16-bit integer
 */
export type CoreIndex = Tagged<u16, "CoreIndex", { maxValue: typeof CORES }>;

/**
 * Index of validator
 * unsigned 16-bit integer
 */
export type ValidatorIndex = Tagged<
  u16,
  "ValidatorIndex",
  { maxValue: typeof NUMBER_OF_VALIDATORS }
>;

/**
 * $(0.6.4 - 9.1)
 * unsigned 32-bit integer
 */
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
  [K in keyof UnTagged<T>]: UnTagged<T>[K] extends Tagged<infer X, never, never>
    ? UnTagged<X>
    : UnTagged<T>[K];
};

export type Validated<T> = Tagged<T, "validated">;

/**
 * Used in WorkItem
 */
export type WorkPayload = Tagged<Uint8Array, "WorkPayload">;

/**
 * Data containing hte Authorization Token inside a WorkPackage
 */
export type Authorization = Tagged<Uint8Array, "Authorization">;

/**
 * Parametrization blob to be used in WorkPackage
 */
export type AuthorizationParams = Tagged<Uint8Array, "AuthorizationParams">;
