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
  WorkContext,
  WorkPackageHash,
} from "@tsjam/types";
import { SlotImpl } from "./SlotImpl";

/**
 * `C` set
 * $(0.7.1 - C.24) | codec
 */
@JamCodecable()
export class WorkContextImpl extends BaseJamCodecable implements WorkContext {
  /**
   * `a` header hash
   */
  @hashCodec("anchor")
  anchorHash!: HeaderHash;

  /**
   * `s`
   */
  @hashCodec("state_root")
  anchorPostState!: StateRootHash;

  /**
   * `b`
   */
  @hashCodec("beefy_root")
  anchorAccOutLog!: BeefyRootHash;

  /**
   * `l`
   */
  @hashCodec("lookup_anchor")
  lookupAnchorHash!: HeaderHash;

  /**
   * `t`
   */
  @eSubIntCodec(4, "lookup_anchor_slot")
  lookupAnchorSlot!: SlotImpl;

  /**
   * `bold_p`
   */
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
