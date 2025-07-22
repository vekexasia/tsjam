import {
  JamCodecable,
  BaseJamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  eSubIntCodec,
  binaryCodec,
  fixedSizeIdentityCodec,
  jsonCodec,
  BufferJSONCodec,
} from "@tsjam/codec";
import {
  RingVRFProof,
  TicketsExtrinsic,
  TicketsExtrinsicElement,
  UpToSeq,
} from "@tsjam/types";

@JamCodecable()
export class TicketsExtrinsicElementImpl
  extends BaseJamCodecable
  implements TicketsExtrinsicElement
{
  /**
   * `r`
   */
  @eSubIntCodec(1)
  attempt!: 0 | 1;
  /**
   * `p`
   */
  @jsonCodec(BufferJSONCodec(), "signature")
  @binaryCodec(fixedSizeIdentityCodec(784))
  proof!: RingVRFProof;
}

@JamCodecable()
export class TicketsExtrinsicImpl
  extends BaseJamCodecable
  implements TicketsExtrinsic
{
  @lengthDiscriminatedCodec(TicketsExtrinsicElementImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<TicketsExtrinsicElementImpl, 16>;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("TicketsExtrinsicImpl", () => {
    it("tickets_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("tickets_extrinsic.bin");
      const { value: eg } = TicketsExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
      console.log(eg.toJSON());
    });
    it("tickets_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("tickets_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const eg: TicketsExtrinsicImpl = TicketsExtrinsicImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
