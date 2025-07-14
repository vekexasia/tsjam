import { LengthDiscriminator } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { IdentityCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { EP_Tuple, ServiceIndex } from "@tsjam/types";
import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";

/*
 * $(0.6.4 - C.15)
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

export const codec_Ep_JSON = ArrayOfJSONCodec(
  createJSONCodec<EP_Tuple, { requester: number; blob: string }>([
    ["serviceIndex", "requester", NumberJSONCodec<ServiceIndex>()],
    ["preimage", "blob", BufferJSONCodec()],
  ]),
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("codecEa", () => {
    it("preimages_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("preimages_extrinsic.bin");
      const decoded = codec_Ep.decode(bin).value;
      expect(codec_Ep.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Ep, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("preimages_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("preimages_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const decoded = codec_Ep_JSON.fromJSON(json);
      const reencoded = codec_Ep_JSON.toJSON(decoded);
      expect(reencoded).deep.eq(json);
    });
  });
}
