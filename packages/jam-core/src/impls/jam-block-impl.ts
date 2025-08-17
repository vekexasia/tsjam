import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { JamBlock } from "@tsjam/types";
import { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import type { JamStateImpl } from "./jam-state-impl";
import { JamSignedHeaderImpl } from "./jam-signed-header-impl";

/**
 * codec: $(0.7.1 - C.16)
 */
@JamCodecable()
export class JamBlockImpl extends BaseJamCodecable implements JamBlock {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(JamBlockExtrinsicsImpl, "extrinsic")
  extrinsics!: JamBlockExtrinsicsImpl;

  static create(_curState: JamStateImpl) {}
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("JamBlockImpl", () => {
    it("block.bin", () => {
      const bin = getCodecFixtureFile("block.bin");
      const { value: header } = JamBlockImpl.decode(bin);
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
