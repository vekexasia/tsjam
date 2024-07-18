import { JamCodec } from "@/codec.js";
import assert from "node:assert";

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

export const HashCodec: JamCodec<Uint8Array> = {
  decode(bytes: Uint8Array): { value: Uint8Array; readBytes: number } {
    // note: using slice is a performance hit. we could subarray which refers to the same memory region but
    // we do not want to make any assumption on the caller's behavior
    return { value: bytes.slice(0, 32), readBytes: 32 };
  },
  encode(value: Uint8Array, bytes: Uint8Array): number {
    assert.ok(
      value.length === 32,
      "HashCodec: invalid hash length. Expected 32 bytes",
    );
    bytes.set(value);
    return value.length;
  },
  encodedSize(): number {
    return 32;
  },
};

// todo: eventually reimplement or find another clever way to handle this
// they share the same properties but the errors are different
export const PublicKeyCodec = HashCodec;
export const BandersnatchCodec = HashCodec;
