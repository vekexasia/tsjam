import { JamCodec } from "@/codec.js";
import { SignedJamHeader } from "@vekexasia/jam-types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";
import assert from "node:assert";
import { bigintToBytes } from "@/bigint_bytes.js";
import { Ed25519SignatureCodec } from "@/identity.js";

/**
 * SignedHeaderCodec is a codec for encoding and decoding signed headers
 * it does use the UnsignedHeaderCodec and appends the block seal
 */
export const SignedHeaderCodec: JamCodec<SignedJamHeader> = {
  decode(bytes: Uint8Array) {
    const unsignedHeader = UnsignedHeaderCodec.decode(bytes);
    return {
      value: {
        ...unsignedHeader.value,
        blockSeal: Ed25519SignatureCodec.decode(
          bytes.slice(unsignedHeader.readBytes, unsignedHeader.readBytes + 64),
        ).value,
      },
      readBytes: unsignedHeader.readBytes + 64,
    };
  },
  encode(value: SignedJamHeader, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      `SignedHeaderCodec: not enough space in buffer when encoding, expected ${this.encodedSize(value)}, got ${bytes.length}`,
    );
    const consumedBytes = UnsignedHeaderCodec.encode(value, bytes);
    Ed25519SignatureCodec.encode(
      value.blockSeal,
      bytes.subarray(consumedBytes),
    );
    return consumedBytes + 64;
  },
  encodedSize(value: SignedJamHeader): number {
    return UnsignedHeaderCodec.encodedSize(value) + 64;
  },
};
