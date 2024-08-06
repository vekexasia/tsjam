import { AssuranceExtrinsic, EA_Extrinsic } from "@/assurances/extrinsic.js";
import {
  bigintToExistingBytes,
  JamCodec,
  BitSequence,
  E,
  bytesToBigInt,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";
import { ED25519Signature, Hash, ValidatorIndex } from "@vekexasia/jam-types";

const singleExtrinsicCodec: JamCodec<AssuranceExtrinsic> = {
  encode(value: AssuranceExtrinsic, bytes: Uint8Array): number {
    let offset = 0;
    offset += bigintToExistingBytes(
      value.anchorHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += BitSequence.encode(value.bitstring, bytes.subarray(offset));
    offset += E.encode(
      BigInt(value.validatorIndex),
      bytes.subarray(offset, offset + 2),
    );
    offset += bigintToExistingBytes(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: AssuranceExtrinsic;
    readBytes: number;
  } {
    const anchorHash: Hash = bytesToBigInt(bytes.subarray(0, 32));
    const bitstring = BitSequence.decode(bytes.subarray(32));
    const validatorIndex = Number(
      E.decode(
        bytes.subarray(32 + bitstring.readBytes, 34 + bitstring.readBytes),
      ).value,
    ) as ValidatorIndex;
    const signature: ED25519Signature = bytesToBigInt(
      bytes.subarray(34 + bitstring.readBytes),
    );
    return {
      value: {
        anchorHash,
        bitstring: bitstring.value as AssuranceExtrinsic["bitstring"],
        validatorIndex,
        signature,
      },
      readBytes: 98 + BitSequence.encodedSize(bitstring.value),
    };
  },
  encodedSize(value: AssuranceExtrinsic): number {
    return 32 + BitSequence.encodedSize(value.bitstring) + 2 + 64;
  },
};

export const codecEa: JamCodec<EA_Extrinsic> =
  createArrayLengthDiscriminator(singleExtrinsicCodec);
