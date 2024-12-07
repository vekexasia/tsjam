import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { IdentityCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { EP_Tuple, ServiceIndex } from "@tsjam/types";
import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils";

/*
 * $(0.5.0 - C.15)
 */
export const codec_Ep = createArrayLengthDiscriminator(
  createCodec<EP_Tuple>([
    ["serviceIndex", E_sub_int<ServiceIndex>(4)],
    [
      "preimage",
      new LengthDiscriminator({
        ...IdentityCodec,
        decode(bytes: Uint8Array, length: number) {
          return IdentityCodec.decode(bytes.subarray(0, length));
        },
      }),
    ],
  ]),
);

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
