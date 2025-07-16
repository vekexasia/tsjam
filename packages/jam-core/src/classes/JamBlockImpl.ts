import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { JamBlock } from "@tsjam/types";
import { JamSignedHeaderImpl } from "./JamHeaderImpl";
import { JamBlockExtrinsicsImpl } from "./JamBlockExtrinsicsImpl";

@JamCodecable()
export class JamBlockImpl extends BaseJamCodecable implements JamBlock {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(JamBlockExtrinsicsImpl, "extrinsic")
  extrinsics!: JamBlockExtrinsicsImpl;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("JamBlockImpl", () => {
    it("block.bin", () => {
      const bin = getCodecFixtureFile("block.bin");
      const { value: header } = JamBlockImpl.decode<JamBlockImpl>(bin);
      console.log(header.toJSON(), "a");
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("block.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("block.json")).toString("utf8"),
      );
      const block: JamBlockImpl = JamBlockImpl.fromJSON(json);
      expect(block.toJSON()).to.deep.eq(json);
    });
  });
}
