import {
  AssuranceExtrinsic,
  EA_Extrinsic,
} from "@/extrinsics/assurances/extrinsic.js";
import {
  bigintToExistingBytes,
  JamCodec,
  BitSequence,
  E,
  HashCodec,
  createArrayLengthDiscriminator,
  Ed25519SignatureCodec,
} from "@vekexasia/jam-codec";
import { ValidatorIndex } from "@vekexasia/jam-types";

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
    const anchorHash = HashCodec.decode(bytes.subarray(0, 32));
    const bitstring = BitSequence.decode(bytes.subarray(anchorHash.readBytes));
    const validatorIndex = Number(
      E.decode(
        bytes.subarray(
          anchorHash.readBytes + bitstring.readBytes,
          2 + anchorHash.readBytes + bitstring.readBytes,
        ),
      ).value,
    ) as ValidatorIndex;
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(34 + bitstring.readBytes),
    );
    return {
      value: {
        anchorHash: anchorHash.value,
        bitstring: bitstring.value as AssuranceExtrinsic["bitstring"],
        validatorIndex,
        signature: signature.value,
      },
      readBytes: 98 + BitSequence.encodedSize(bitstring.value),
    };
  },
  encodedSize(value: AssuranceExtrinsic): number {
    return 32 + BitSequence.encodedSize(value.bitstring) + 2 + 64;
  },
};

export const codecEa = createArrayLengthDiscriminator(
  singleExtrinsicCodec,
) as unknown as JamCodec<EA_Extrinsic>;
