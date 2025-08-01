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
import { Hashing } from "@tsjam/crypto";
import { EP_Extrinsic, EP_Tuple, ServiceIndex, Validated } from "@tsjam/types";
import { Result, err, ok } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";
import { DeltaImpl } from "../DeltaImpl";
import { toTagged } from "@tsjam/utils";

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

  checkValidity(deps: {
    serviceAccounts: DeltaImpl;
  }): Result<Validated<PreimagesExtrinsicImpl>, EPError> {
    for (const { requester } of this.elements) {
      if (requester < 0 || requester >= 2 ** 32) {
        return err(EPError.VALIDATION_ERROR);
      }
    }

    // $(0.7.1 - 12.34)
    for (let i = 1; i < this.elements.length; i++) {
      const prev = this.elements[i - 1];
      if (prev.requester > this.elements[i].requester) {
        return err(EPError.PREIMAGES_NOT_SORTED);
      } else if (prev.requester === this.elements[i].requester) {
        const comparisonResult = compareUint8Arrays(
          prev.blob,
          this.elements[i].blob,
        );
        if (comparisonResult !== -1) {
          return err(EPError.PREIMAGES_NOT_SORTED);
        }
      }
    }
    // $(0.7.1 - 12.35) data must be solicited by a service but not yet provided
    for (const { requester, blob } of this.elements) {
      if (
        !deps.serviceAccounts
          .get(requester)!
          .isPreimageSolicitedButNotYetProvided(
            Hashing.blake2b(blob),
            blob.length,
          )
      ) {
        return err(EPError.PREIMAGE_PROVIDED_OR_UNSOLICITED);
      }
    }

    return ok(toTagged(this));
  }
}

export enum EPError {
  VALIDATION_ERROR = "EP Validation Error",
  PREIMAGE_PROVIDED_OR_UNSOLICITED = "Preimage Provided or unsolicied",
  PREIMAGES_NOT_SORTED = "preimages should be sorted",
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
