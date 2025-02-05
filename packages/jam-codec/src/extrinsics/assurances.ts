import { AssuranceExtrinsic, EA_Extrinsic, ValidatorIndex } from "@tsjam/types";
import { CORES } from "@tsjam/constants";
import { bigintToExistingBytes } from "@tsjam/utils";
import { JamCodec } from "@/codec.js";
import { BitSequence } from "@/bitSequence.js";
import { E_2 } from "@/ints/E_subscr.js";
import { Ed25519SignatureCodec, HashCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";

const singleExtrinsicCodec: JamCodec<AssuranceExtrinsic> = {
  encode(value: AssuranceExtrinsic, bytes: Uint8Array): number {
    let offset = 0;
    offset += bigintToExistingBytes(
      value.anchorHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += BitSequence.encode(value.bitstring, bytes.subarray(offset));
    offset += E_2.encode(
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
    let offset = 0;
    const anchorHash = HashCodec.decode(bytes.subarray(0, 32));
    offset += anchorHash.readBytes;
    const bitstring = BitSequence.decode(
      bytes.subarray(offset, offset + Math.ceil(CORES / 8)),
    );
    offset += bitstring.readBytes;

    const validatorIndex = Number(
      E_2.decode(bytes.subarray(offset, offset + 2)).value,
    ) as ValidatorIndex;
    offset += 2;
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(offset, offset + 64),
    );
    offset += signature.readBytes;
    return {
      value: {
        anchorHash: anchorHash.value,
        bitstring: bitstring.value.slice(
          0,
          CORES,
        ) as AssuranceExtrinsic["bitstring"],
        validatorIndex,
        signature: signature.value,
      },
      readBytes: offset,
    };
  },
  encodedSize(value: AssuranceExtrinsic): number {
    return 32 + BitSequence.encodedSize(value.bitstring) + 2 + 64;
  },
};

/**
 * $(0.6.1 - C.17)
 */
export const codec_Ea = createArrayLengthDiscriminator(
  singleExtrinsicCodec,
) as unknown as JamCodec<EA_Extrinsic>;

if (import.meta.vitest) {
  const { vi, beforeAll, describe, expect, it } = import.meta.vitest;
  const constants = await import("@tsjam/constants");
  const { encodeWithCodec } = await import("@/utils");
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  describe("codecEa", () => {
    const bin = getCodecFixtureFile("assurances_extrinsic.bin");
    beforeAll(() => {
      // @ts-expect-error cores
      vi.spyOn(constants, "CORES", "get").mockReturnValue(2);
    });
    it("assurances_extrinsic.json encoded should match assurances_extrinsic.bin", () => {
      const decoded = codec_Ea.decode(bin).value;
      expect(codec_Ea.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Ea, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
