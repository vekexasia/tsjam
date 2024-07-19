import { JamCodec } from "@/codec.js";
import { SignedJamHeader } from "@vekexasia/jam-types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";

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
    const consumedBytes = UnsignedHeaderCodec.encode(value, bytes);
    bytes.set(value.blockSeal, consumedBytes);
    return consumedBytes + 32;
  },
  encodedSize(value: SignedJamHeader): number {
    return UnsignedHeaderCodec.encodedSize(value) + 32;
  },
};
