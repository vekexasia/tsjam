declare const tags: unique symbol;
export type Tagged<
  BaseType,
  Tag extends PropertyKey,
  Metadata = void,
> = BaseType & {
  [tags]: { [K in Tag]: Metadata };
};
export type u32 = Tagged<number, "u32">;
export type u8 = Tagged<number, "u8">;

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
