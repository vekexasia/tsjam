import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { IdentityCodec } from "@/identity.js";
import { JamCodec } from "@/codec.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { EP_Tuple, ServiceIndex } from "@vekexasia/jam-types";
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
 */
export const codec_Ep = createArrayLengthDiscriminator(singleItemCodec);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const fs = await import("fs");

  const { hexToBytes } = await import("@vekexasia/jam-utils");
  const path = await import("path");
  describe("codecEa", () => {
    const bin = fs.readFileSync(
      path.resolve(__dirname, "../../test/fixtures/preimages_extrinsic.bin"),
    );
    const json = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../test/fixtures/preimages_extrinsic.json"),
        "utf8",
      ),
    );
    it("preimages_extrinsic.json encoded should match preimages_extrinsic.bin", () => {
      const preimage: EP_Tuple[] = json.map((e: any) => ({
        serviceIndex: e.requester,
        preimage: hexToBytes(e.blob),
      }));
      const b = new Uint8Array(bin.length);
      codec_Ep.encode(preimage, b);
      expect(codec_Ep.encodedSize(preimage)).toBe(bin.length);
      expect(Buffer.from(b).toString("hex")).toBe(bin.toString("hex"));
      // check decode now
      const x = codec_Ep.decode(b);
      expect(x.value).toEqual(preimage);
    });
  });
}
