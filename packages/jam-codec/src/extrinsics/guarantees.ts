import { EG_Extrinsic, ValidatorIndex, u32 } from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { Ed25519SignatureCodec } from "@/identity.js";
import { E_2, E_4 } from "@/ints/E_subscr.js";
import { JamCodec } from "@/codec.js";
import { WorkReportCodec } from "@/setelements/WorkReportCodec.js";
import { Hashing } from "@tsjam/crypto";
import { encodeWithCodec } from "@/utils.js";

const signaturesCodec = createArrayLengthDiscriminator<
  EG_Extrinsic[0]["credential"][0]
>({
  encode(value: EG_Extrinsic[0]["credential"][0], bytes: Uint8Array): number {
    let offset = E_2.encode(BigInt(value.validatorIndex), bytes.subarray(0, 2));
    offset += Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0]["credential"][0];
    readBytes: number;
  } {
    const validatorIndex = E_2.decode(bytes);
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(validatorIndex.readBytes),
    );
    return {
      value: {
        validatorIndex: Number(validatorIndex.value) as ValidatorIndex,
        signature: signature.value,
      },
      readBytes: validatorIndex.readBytes + signature.readBytes,
    };
  },
  encodedSize: function (value: EG_Extrinsic[0]["credential"][0]): number {
    return (
      E_2.encodedSize(BigInt(value.validatorIndex)) +
      Ed25519SignatureCodec.encodedSize(value.signature)
    );
  },
});

const codecSingleGuarantee: JamCodec<EG_Extrinsic[0]> = {
  encode(value: EG_Extrinsic[0], bytes: Uint8Array): number {
    let offset = WorkReportCodec.encode(value.workReport, bytes);
    offset += E_4.encode(
      BigInt(value.timeSlot),
      bytes.subarray(offset, offset + 4),
    );
    offset += signaturesCodec.encode(value.credential, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0];
    readBytes: number;
  } {
    const workReport = WorkReportCodec.decode(bytes);
    const timeSlot = E_4.decode(bytes.subarray(workReport.readBytes));
    const credential = signaturesCodec.decode(
      bytes.subarray(workReport.readBytes + timeSlot.readBytes),
    );
    return {
      value: {
        workReport: workReport.value,
        timeSlot: Number(timeSlot.value) as u32,
        credential: credential.value as EG_Extrinsic[0]["credential"],
      },
      readBytes:
        workReport.readBytes + timeSlot.readBytes + credential.readBytes,
    };
  },
  encodedSize: function (value: EG_Extrinsic[0]): number {
    return (
      WorkReportCodec.encodedSize(value.workReport) +
      E_4.encodedSize(BigInt(value.timeSlot)) +
      signaturesCodec.encodedSize(value.credential)
    );
  },
};

// $(0.5.0 - 5.6)
const codecSingleGuaranteeForExtrinsicHash: JamCodec<EG_Extrinsic[0]> = {
  encode(value, bytes) {
    bytes.set(
      Hashing.blake2bBuf(encodeWithCodec(WorkReportCodec, value.workReport)),
    );
    let offset = 32;
    offset += E_4.encode(
      BigInt(value.timeSlot),
      bytes.subarray(offset, offset + 4),
    );
    offset += signaturesCodec.encode(value.credential, bytes.subarray(offset));
    return offset;
  },
  decode() {
    throw new Error(
      "codecSingleGuaranteeForExtrinsicHash is not meant to be decoded",
    );
  },
  encodedSize(value) {
    return 32 + 4 + signaturesCodec.encodedSize(value.credential);
  },
};

/**
 * $(0.5.0 - C.16)
 */
export const codec_Eg = createArrayLengthDiscriminator<EG_Extrinsic[0]>(
  codecSingleGuarantee,
) as unknown as JamCodec<EG_Extrinsic>;

export const codec_Eg_4Hx = createArrayLengthDiscriminator<EG_Extrinsic[0]>(
  codecSingleGuaranteeForExtrinsicHash,
) as unknown as JamCodec<EG_Extrinsic>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { encodeWithCodec } = await import("@/utils.js");
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  describe("codecEg", () => {
    const bin = getCodecFixtureFile("guarantees_extrinsic.bin");
    it("guarantees_extrinsic.json encoded should match guarantees_extrinsic.bin", () => {
      const decoded = codec_Eg.decode(bin).value;
      expect(codec_Eg.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Eg, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
