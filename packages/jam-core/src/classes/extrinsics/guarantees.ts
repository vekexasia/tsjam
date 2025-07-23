import {
  BaseJamCodecable,
  codec,
  ed25519SignatureCodec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import {
  BoundedSeq,
  CoreIndex,
  ED25519Signature,
  EG_Extrinsic,
  SingleWorkReportGuarantee,
  SingleWorkReportGuaranteeSignature,
  Tau,
  UpToSeq,
  ValidatorIndex,
} from "@tsjam/types";
import { WorkReportImpl } from "../WorkReportImpl";
import { CORES } from "@tsjam/constants";

@JamCodecable()
export class SingleWorkReportGuaranteeSignatureImpl
  extends BaseJamCodecable
  implements SingleWorkReportGuaranteeSignature
{
  /**
   * `v`
   */
  @eSubIntCodec(2, "validator_index")
  validatorIndex!: ValidatorIndex;
  /**
   * `s`
   */
  @ed25519SignatureCodec()
  signature!: ED25519Signature;
}

@JamCodecable()
export class SingleWorkReportGuaranteeImpl
  extends BaseJamCodecable
  implements SingleWorkReportGuarantee
{
  /**
   * `bold_r`
   * the `.core` of this workload must be unique within
   * the full extrinsic
   */
  @codec(WorkReportImpl)
  report!: WorkReportImpl;
  /**
   * `t`
   */
  @eSubIntCodec(4)
  slot!: Tau;

  /**
   * `a`
   * the creds must be ordered by `validatorIndex`
   *
   */

  @lengthDiscriminatedCodec(SingleWorkReportGuaranteeSignatureImpl)
  signatures!: BoundedSeq<SingleWorkReportGuaranteeSignatureImpl, 2, 3>;
}

@JamCodecable()
export class GuaranteesExtrinsicImpl
  extends BaseJamCodecable
  implements EG_Extrinsic
{
  @lengthDiscriminatedCodec(SingleWorkReportGuaranteeImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<SingleWorkReportGuaranteeImpl, typeof CORES>;

  elementForCore(core: CoreIndex) {
    return this.elements.find((el) => el.report.core === core);
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("codecEG", () => {
    it("guarantees_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("guarantees_extrinsic.bin");
      const { value: eg } = GuaranteesExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("aguarantees_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("guarantees_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const eg: GuaranteesExtrinsicImpl =
        GuaranteesExtrinsicImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
