import {
  BaseJamCodecable,
  bitSequenceCodec,
  ed25519SignatureCodec,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  AssuranceExtrinsic,
  EA_Extrinsic,
  ED25519Signature,
  Hash,
  SeqOfLength,
  UpToSeq,
  ValidatorIndex,
} from "@tsjam/types";

// Single extrinsic element
// codec order defined in $(0.7.0 - C.27)
@JamCodecable()
export class AssuranceExtrinsicImpl
  extends BaseJamCodecable
  implements AssuranceExtrinsic
{
  /**
   * `a` the hash of parent header
   **/
  @hashCodec("anchor")
  anchorHash!: Hash;

  /**
   * `f`
   */
  @bitSequenceCodec(CORES, "bitfield")
  bitstring!: SeqOfLength<0 | 1, typeof CORES>;

  /**
   * `v` the validator index assuring they're contributing to the Data availability
   */
  @eSubIntCodec(2, "validator_index")
  validatorIndex!: ValidatorIndex;

  /**
   * `s` the signature of the validator
   */
  @ed25519SignatureCodec("signature")
  signature!: ED25519Signature;
}

@JamCodecable()
export class AssurancesExtrinsicImpl
  extends BaseJamCodecable
  implements EA_Extrinsic
{
  @lengthDiscriminatedCodec(AssuranceExtrinsicImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<AssuranceExtrinsic, typeof NUMBER_OF_VALIDATORS>;

  nPositiveVotes(core: number) {
    return this.elements.reduce((a, b) => a + b.bitstring[core], 0);
  }
}
//TODO: implement isValid

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("codecEa", () => {
    it("assurances_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("assurances_extrinsic.bin");
      const { value: ea } =
        AssurancesExtrinsicImpl.decode<AssurancesExtrinsicImpl>(bin);
      expect(Buffer.from(ea.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("assurances_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("assurances_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const ea: AssurancesExtrinsicImpl =
        AssurancesExtrinsicImpl.fromJSON(json);

      expect(ea.toJSON()).to.deep.eq(json);
    });
  });
}
