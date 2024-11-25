import { JamCodec } from "@/codec.js";
import { SignedJamHeader } from "@tsjam/types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";
import assert from "node:assert";
import { BandersnatchSignatureCodec } from "@/identity.js";
import { encodeWithCodec } from "@/utils";

/**
 * SignedHeaderCodec is a codec for encoding and decoding signed headers
 * it does use the UnsignedHeaderCodec and appends the block seal
 * $(0.5.0 - C.19)
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
    };
  });
  vi.mock("@tsjam/constants", async (importOriginal) => {
    const toRet = {
      ...(await importOriginal<typeof import("@tsjam/constants")>()),
    };
    Object.defineProperty(toRet, "EPOCH_LENGTH", {
      get() {
        return constantMocks.EPOCH_LENGTH;
      },
    });
    Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
      get() {
        return constantMocks.NUMBER_OF_VALIDATORS;
      },
    });
    return toRet;
  });
  const { getCodecFixtureFile, getUTF8FixtureFile, headerFromJSON } =
    await import("@/test/utils.js");
  describe("SignedHeader", () => {
    beforeAll(() => {});
    let item: SignedJamHeader;
    let bin: Uint8Array;
    describe("header_0", () => {
      beforeAll(() => {
        const json = JSON.parse(getUTF8FixtureFile("header_0.json"));
        item = headerFromJSON(json);
        bin = getCodecFixtureFile("header_0.bin");
      });

      it("should encode properly", () => {
        const bytes = encodeWithCodec(SignedHeaderCodec, item);
        const off = 0;
        expect(Buffer.from(bytes).subarray(off).toString("hex")).toBe(
          Buffer.from(bin).subarray(off).toString("hex"),
        );
        expect(bytes).toEqual(bin);
      });
      it("should decode properly", () => {
        const { value, readBytes } = SignedHeaderCodec.decode(bin);
        expect(value).toEqual(item);
        expect(readBytes).toBe(bin.length);
      });
    });
    describe("header_1", () => {
      beforeAll(() => {
        const json = JSON.parse(getUTF8FixtureFile("header_1.json"));
        item = headerFromJSON(json);
        bin = getCodecFixtureFile("header_1.bin");
      });

      it("should encode properly", () => {
        const bytes = new Uint8Array(SignedHeaderCodec.encodedSize(item));
        SignedHeaderCodec.encode(item, bytes);
        expect(bytes).toEqual(bin);
      });
      it("should decode properly", () => {
        const { value, readBytes } = SignedHeaderCodec.decode(bin);
        expect(value).toEqual(item);
        expect(readBytes).toBe(bin.length);
      });
    });
  });
}
