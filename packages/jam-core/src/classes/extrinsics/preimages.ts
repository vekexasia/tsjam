import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EP_Extrinsic, EP_Tuple, ServiceIndex } from "@tsjam/types";

@JamCodecable()
export class PreimageElement extends BaseJamCodecable implements EP_Tuple {
  @eSubIntCodec(4)
  requester!: ServiceIndex;

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  blob!: Uint8Array;
}
@JamCodecable()
export class PreimagesExtrinsicImpl
  extends BaseJamCodecable
  implements EP_Extrinsic
{
  @lengthDiscriminatedCodec(PreimageElement, SINGLE_ELEMENT_CLASS)
  elements!: PreimageElement[];
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("PreimagesExtrinsicImpl", () => {
    it("preimages_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("preimages_extrinsic.bin");
      const { value: eg } = PreimagesExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("preimages_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("preimages_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const eg = PreimagesExtrinsicImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
