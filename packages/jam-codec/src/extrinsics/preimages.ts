import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { IdentityCodec } from "@/identity.js";
import { JamCodec } from "@/codec.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { EP_Tuple, ServiceIndex } from "@tsjam/types";
import { E_4 } from "@/ints/E_subscr.js";

const preimageCodec = new LengthDiscriminator({
  ...IdentityCodec,
  decode(bytes: Uint8Array, length: number) {
    return IdentityCodec.decode(bytes.subarray(0, length));
  },
});

/**
 * Codec for a single item in the extrinsic payload
 */
const singleItemCodec: JamCodec<EP_Tuple> = {
  encode(value: EP_Tuple, bytes: Uint8Array): number {
    let offset = E_4.encode(BigInt(value.serviceIndex), bytes.subarray(0, 4));
    offset += preimageCodec.encode(value.preimage, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: EP_Tuple; readBytes: number } {
    const decodedServiceIndex = E_4.decode(bytes.subarray(0, 4));
    const decodedPreimage = preimageCodec.decode(
      bytes.subarray(decodedServiceIndex.readBytes),
    );
    return {
      value: {
        serviceIndex: Number(decodedServiceIndex.value) as ServiceIndex,
        preimage: decodedPreimage.value,
      },
      readBytes: decodedServiceIndex.readBytes + decodedPreimage.readBytes,
    };
  },
  encodedSize(value: EP_Tuple): number {
    return (
      E_4.encodedSize(BigInt(value.serviceIndex)) +
      preimageCodec.encodedSize(value.preimage)
    );
  },
};

/**
 * Codec for the extrinsic payload
 * $(0.5.0 - C.15)
 */
export const codec_Ep = createArrayLengthDiscriminator(singleItemCodec);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("codecEa", () => {
    const bin = getCodecFixtureFile("preimages_extrinsic.bin");
    it("preimages_extrinsic.json encoded should match preimages_extrinsic.bin", () => {
      const decoded = codec_Ep.decode(bin).value;
      expect(codec_Ep.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Ep, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
