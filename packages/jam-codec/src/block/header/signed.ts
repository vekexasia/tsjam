import { JamCodec } from "@/codec.js";
import { SignedJamHeader } from "@tsjam/types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";
import assert from "node:assert";
import { BandersnatchSignatureCodec } from "@/identity.js";

/**
 * SignedHeaderCodec is a codec for encoding and decoding signed headers
 * it does use the UnsignedHeaderCodec and appends the block seal
 * $(0.6.1 - C.19)
 */
export const SignedHeaderCodec: JamCodec<SignedJamHeader> = {
  decode(bytes: Uint8Array) {
    const unsignedHeader = UnsignedHeaderCodec.decode(bytes);
    return {
      value: {
        ...unsignedHeader.value,
        blockSeal: BandersnatchSignatureCodec.decode(
          bytes.subarray(
            unsignedHeader.readBytes,
            unsignedHeader.readBytes + 96,
          ),
        ).value,
      },
      readBytes: unsignedHeader.readBytes + 96,
    };
  },
  encode(value: SignedJamHeader, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      `SignedHeaderCodec: not enough space in buffer when encoding, expected ${this.encodedSize(value)}, got ${bytes.length}`,
    );
    const consumedBytes = UnsignedHeaderCodec.encode(value, bytes);
    BandersnatchSignatureCodec.encode(
      value.blockSeal,
      bytes.subarray(consumedBytes, consumedBytes + 96),
    );
    return consumedBytes + 96;
  },
  encodedSize(value: SignedJamHeader): number {
    return UnsignedHeaderCodec.encodedSize(value) + 96;
  },
};

if (import.meta.vitest) {
  const { vi, beforeAll, describe, it, expect } = import.meta.vitest;

  const constantMocks = vi.hoisted(() => {
    return {
      NUMBER_OF_VALIDATORS: 6,
      EPOCH_LENGTH: 12,
      MINIMUM_VALIDATORS: (6 * 2) / 3 + 1,
      CORES: 2,
    };
  });
  vi.mock("@tsjam/constants", async (importOriginal) => {
    const toRet = {
      ...(await importOriginal<typeof import("@tsjam/constants")>()),
    };
    Object.defineProperty(toRet, "CORES", {
      get() {
        return constantMocks.CORES;
      },
    });
    Object.defineProperty(toRet, "EPOCH_LENGTH", {
      get() {
        return constantMocks.EPOCH_LENGTH;
      },
    });
    Object.defineProperty(toRet, "MINIMUM_VALIDATORS", {
      get() {
        return constantMocks.MINIMUM_VALIDATORS;
      },
    });
    Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
      get() {
        return constantMocks.NUMBER_OF_VALIDATORS;
      },
    });
    return toRet;
  });
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("SignedHeader", () => {
    let bin: Uint8Array;
    describe("header_0", () => {
      beforeAll(() => {
        bin = getCodecFixtureFile("header_0.bin");
      });
      it("should encode/decode properly", () => {
        const decoded = SignedHeaderCodec.decode(bin).value;
        expect(SignedHeaderCodec.encodedSize(decoded)).toBe(bin.length);
        const reencoded = encodeWithCodec(SignedHeaderCodec, decoded);
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin).toString("hex"),
        );
      });
    });
    describe("header_1", () => {
      beforeAll(() => {
        bin = getCodecFixtureFile("header_1.bin");
      });

      it("should encode/decode properly", () => {
        const decoded = SignedHeaderCodec.decode(bin).value;
        expect(SignedHeaderCodec.encodedSize(decoded)).toBe(bin.length);
        const reencoded = encodeWithCodec(SignedHeaderCodec, decoded);
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin).toString("hex"),
        );
      });
    });
  });
}
