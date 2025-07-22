import {
  BaseJamCodecable,
  eSubIntCodec,
  HashCodec,
  hashCodec,
  HashJSONCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import {
  BeefyRootHash,
  HeaderHash,
  StateRootHash,
  Tau,
  WorkContext,
  WorkPackageHash,
} from "@tsjam/types";

// codec order defined in $(0.6.4 - C.21)
@JamCodecable()
export class WorkContextImpl extends BaseJamCodecable implements WorkContext {
  @hashCodec("anchor")
  anchorHash!: HeaderHash;

  @hashCodec("state_root")
  anchorPostState!: StateRootHash;

  @hashCodec("beefy_root")
  anchorAccOutLog!: BeefyRootHash;

  @hashCodec("lookup_anchor")
  lookupAnchorHash!: HeaderHash;

  @eSubIntCodec(4, "lookup_anchor_slot")
  lookupAnchorTime!: Tau;

  @lengthDiscriminatedCodec({
    ...HashCodec,
    ...HashJSONCodec(),
  })
  prerequisites!: WorkPackageHash[];
}

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("WorkContextCodec", () => {
    let bin: Uint8Array;
    let json: object;
    beforeAll(() => {
      bin = getCodecFixtureFile("refine_context.bin");
      json = JSON.parse(
        Buffer.from(getCodecFixtureFile("refine_context.json")).toString(
          "utf8",
        ),
      );
    });

    it("should encode/decode properly", () => {
      const decoded = WorkContextImpl.decode(bin);
      const reencoded = decoded.value.toBinary();
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("should encode/decode json properly", () => {
      const decoded = WorkContextImpl.fromJSON(json);
      const reencoded = decoded.toJSON();
      expect(reencoded).toEqual(json);
    });
  });
}
