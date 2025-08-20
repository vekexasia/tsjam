import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  lengthDiscriminatedCodec,
  xBytesCodec,
} from "@tsjam/codec";
import type {
  BeefyRootHash,
  HeaderHash,
  StateRootHash,
  WorkContext,
  WorkPackageHash,
} from "@tsjam/types";
import { SlotImpl } from "./slot-impl";

/**
 * `C` set
 * $(0.7.1 - C.24) | codec
 */
@JamCodecable()
export class WorkContextImpl extends BaseJamCodecable implements WorkContext {
  /**
   * `a` header hash
   */
  @codec(xBytesCodec(32), "anchor")
  anchorHash!: HeaderHash;

  /**
   * `s`
   */
  @codec(xBytesCodec(32), "state_root")
  anchorPostState!: StateRootHash;

  /**
   * `b`
   */
  @codec(xBytesCodec(32), "beefy_root")
  anchorAccOutLog!: BeefyRootHash;

  /**
   * `l`
   */
  @codec(xBytesCodec(32), "lookup_anchor")
  lookupAnchorHash!: HeaderHash;

  /**
   * `t`
   */
  @codec(SlotImpl, "lookup_anchor_slot")
  lookupAnchorSlot!: SlotImpl;

  /**
   * `bold_p`
   */
  @lengthDiscriminatedCodec(xBytesCodec(32))
  prerequisites!: WorkPackageHash[];
}

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
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
