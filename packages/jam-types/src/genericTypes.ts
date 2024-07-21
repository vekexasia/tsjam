declare const tags: unique symbol;
export type Tagged<
  BaseType,
  Tag extends PropertyKey,
  Metadata = void,
> = BaseType & {
  [tags]: { [K in Tag]: Metadata };
};
export type u32 = Tagged<number, "u32">;

export type ByteArrayOfLength<T extends number> = Tagged<
  Uint8Array,
  `ByteArrayOfLength${T}`,
  { byteLength: T }
>;
export type ByteArray32 = ByteArrayOfLength<32>;
export type BandersnatchKey = Tagged<ByteArray32, "BandersnatchKey">;
export type OpaqueHash = Tagged<ByteArray32, "OpaqueHash">;
export type ED25519PublicKey = Tagged<ByteArray32, "ED25519PublicKey">;
export type BLSKey = Tagged<ByteArrayOfLength<144>, "BLSKey">;
