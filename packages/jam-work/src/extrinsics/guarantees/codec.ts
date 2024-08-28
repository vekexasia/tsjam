import {
  createArrayLengthDiscriminator,
  E,
  Ed25519SignatureCodec,
  JamCodec,
  WMemberCodec,
} from "@vekexasia/jam-codec";
import { EG_Extrinsic } from "@/extrinsics/guarantees/extrinsic.js";
import { u32, ValidatorIndex } from "@vekexasia/jam-types";

const signaturesCodec = createArrayLengthDiscriminator<
  EG_Extrinsic[0]["credential"][0]
>({
  encode(value: EG_Extrinsic[0]["credential"][0], bytes: Uint8Array): number {
    let offset = E.encode(BigInt(value.validatorIndex), bytes);
    offset += Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(offset),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0]["credential"][0];
    readBytes: number;
  } {
    const validatorIndex = E.decode(bytes);
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
      E.encodedSize(BigInt(value.validatorIndex)) +
      Ed25519SignatureCodec.encodedSize(value.signature)
    );
  },
});
const codecSingleGuarantee: JamCodec<EG_Extrinsic[0]> = {
  encode(value: EG_Extrinsic[0], bytes: Uint8Array): number {
    let offset = WMemberCodec.encode(value.workReport, bytes);
    offset += E.encode(BigInt(value.timeSlot), bytes.subarray(offset));
    offset += signaturesCodec.encode(value.credential, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: EG_Extrinsic[0];
    readBytes: number;
  } {
    const workReport = WMemberCodec.decode(bytes);
    const timeSlot = E.decode(bytes.subarray(workReport.readBytes));
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
      WMemberCodec.encodedSize(value.workReport) +
      E.encodedSize(BigInt(value.timeSlot)) +
      signaturesCodec.encodedSize(value.credential)
    );
  },
};

export const codecEG_Extrinsic = createArrayLengthDiscriminator<
  EG_Extrinsic[0]
>(codecSingleGuarantee) as unknown as JamCodec<EG_Extrinsic>;

// TODO:implement tests
