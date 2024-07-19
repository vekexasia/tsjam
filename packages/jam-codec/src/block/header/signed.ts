import { JamCodec } from "@/codec.js";
import { SignedJamHeader } from "@vekexasia/jam-types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";
import assert from "node:assert";

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
        blockSeal: bytes.slice(
          unsignedHeader.readBytes,
          unsignedHeader.readBytes + 32,
        ),
      },
      readBytes: unsignedHeader.readBytes + 32,
    };
  },
  encode(value: SignedJamHeader, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      `SignedHeaderCodec: not enough space in buffer when encoding, expected ${this.encodedSize(value)}, got ${bytes.length}`,
    );
    const consumedBytes = UnsignedHeaderCodec.encode(value, bytes);
    bytes.set(value.blockSeal, consumedBytes);
    return consumedBytes + 32;
  },
  encodedSize(value: SignedJamHeader): number {
    return UnsignedHeaderCodec.encodedSize(value) + 32;
  },
};
