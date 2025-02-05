import { SignedHeaderCodec } from "@/block/header/signed.js";
import { codec_Et } from "@/extrinsics/tickets.js";
import { codec_Ed } from "@/extrinsics/disputes.js";
import { codec_Ep } from "@/extrinsics/preimages.js";
import { codec_Ea } from "@/extrinsics/assurances.js";
import { codec_Eg } from "@/extrinsics/guarantees.js";
import { JamBlock } from "@tsjam/types";
import { createCodec } from "@/utils";

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
  });
}
