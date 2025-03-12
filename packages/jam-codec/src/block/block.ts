import {
  SignedHeaderCodec,
  SignedHeaderJSONCodec,
} from "@/block/header/signed.js";
import { codec_Et, codec_Et_JSON } from "@/extrinsics/tickets.js";
import { codec_Ed, codec_Ed_JSON } from "@/extrinsics/disputes.js";
import { codec_Ep, codec_Ep_JSON } from "@/extrinsics/preimages.js";
import { codec_Ea, codec_Ea_JSON } from "@/extrinsics/assurances.js";
import { codec_Eg, codec_Eg_JSON } from "@/extrinsics/guarantees.js";
import { JamBlock } from "@tsjam/types";
import { createCodec } from "@/utils";
import { createJSONCodec, JC_J, JSONCodec } from "@/json/JsonCodec";

/**
 * Codec for block extrinsic. used in both block serialiation and computing `Hx`
 * $(0.6.1 - C.13)
 */
export const BlockCodec = createCodec<JamBlock>([
  ["header", SignedHeaderCodec],
  [
    "extrinsics",
    createCodec<JamBlock["extrinsics"]>([
      ["tickets", codec_Et],
      ["preimages", codec_Ep],
      ["reportGuarantees", codec_Eg],
      ["assurances", codec_Ea],
      ["disputes", codec_Ed],
    ]),
  ],
]);

export const BlockJSONCodec: JSONCodec<
  JamBlock,
  {
    header: JC_J<typeof SignedHeaderJSONCodec>;
    extrinsic: {
      tickets: JC_J<typeof codec_Et_JSON>;
      preimages: JC_J<typeof codec_Ep_JSON>;
      guarantees: JC_J<typeof codec_Eg_JSON>;
      assurances: JC_J<typeof codec_Ea_JSON>;
      disputes: JC_J<typeof codec_Ed_JSON>;
    };
  }
> = createJSONCodec([
  ["header", "header", SignedHeaderJSONCodec],
  [
    "extrinsics",
    "extrinsic",
    createJSONCodec<JamBlock["extrinsics"]>([
      ["tickets", "tickets", codec_Et_JSON],
      ["preimages", "preimages", codec_Ep_JSON],
      ["reportGuarantees", "guarantees", codec_Eg_JSON],
      ["assurances", "assurances", codec_Ea_JSON],
      ["disputes", "disputes", codec_Ed_JSON],
    ]),
  ],
]);

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("Block", () => {
    const bin = getCodecFixtureFile("block.bin");
    it("should match block.bin", () => {
      const decoded = BlockCodec.decode(bin).value;
      expect(BlockCodec.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(BlockCodec, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("should match block.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("block.json")).toString("utf8"),
      );
      const decoded = BlockJSONCodec.fromJSON(json);
      expect(BlockJSONCodec.toJSON(decoded)).deep.eq(json);
    });
    it("should not matter bin or json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("block.json")).toString("utf8"),
      );
      const jsonDecoded = BlockJSONCodec.fromJSON(json);
      const decoded = BlockCodec.decode(bin).value;
      expect(jsonDecoded).deep.eq(decoded);
    });
  });
}
