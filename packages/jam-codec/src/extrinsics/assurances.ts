import {
  AssuranceExtrinsic,
  ByteArrayOfLength,
  EA_Extrinsic,
  ValidatorIndex,
} from "@tsjam/types";
import { CORES } from "@tsjam/constants";
import { bigintToExistingBytes } from "@tsjam/utils";
import { JamCodec } from "@/codec.js";
import { BitSequence } from "@/bitSequence.js";
import { E_2 } from "@/ints/E_subscr.js";
import { Ed25519SignatureCodec, HashCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  Ed25519SignatureJSONCodec,
  HashJSONCodec,
  JSONCodec,
  NumberJSONCodec,
  ZipJSONCodecs,
} from "@/json/JsonCodec";

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
 * $(0.6.4 - C.17)
 */
export const codec_Ea = createArrayLengthDiscriminator(
  singleExtrinsicCodec,
) as unknown as JamCodec<EA_Extrinsic>;

export const codec_Ea_JSON = <JSONCodec<EA_Extrinsic>>ArrayOfJSONCodec(
  createJSONCodec<
    AssuranceExtrinsic,
    {
      anchor: string;
      bitfield: string;
      validator_index: number;
      signature: string;
    }
  >([
    ["anchorHash", "anchor", HashJSONCodec()],
    [
      "bitstring",
      "bitfield",
      ZipJSONCodecs(BufferJSONCodec(), {
        fromJSON(json) {
          const bitstring: Array<0 | 1> = [];
          for (let i = 0; i < CORES; i++) {
            const byte = (i / 8) | 0;
            const index = i % 8;

            bitstring.push(((Number(json[byte]) >> index) % 2) as 0 | 1);
          }
          return bitstring as AssuranceExtrinsic["bitstring"];
        },
        toJSON(value) {
          const toRet = Buffer.alloc(Math.floor((value.length + 7) / 8)).fill(
            0,
          );
          for (let i = 0; i < value.length; i++) {
            const byte = (i / 8) | 0;
            const index = i % 8;

            const curVal = toRet[byte];
            toRet[byte] = curVal | (value[i] << index);
          }
          return toRet as unknown as ByteArrayOfLength<number>;
        },
      }),
    ],
    ["validatorIndex", "validator_index", NumberJSONCodec<ValidatorIndex>()],
    ["signature", "signature", Ed25519SignatureJSONCodec],
  ]),
);

if (import.meta.vitest) {
  const { vi, beforeAll, describe, expect, it } = import.meta.vitest;
  const constants = await import("@tsjam/constants");
  const { encodeWithCodec } = await import("@/utils");
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  describe("codecEa", () => {
    beforeAll(() => {
      // @ts-expect-error cores
      vi.spyOn(constants, "CORES", "get").mockReturnValue(2);
    });
    it("assurances_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("assurances_extrinsic.bin");
      const decoded = codec_Ea.decode(bin).value;
      expect(codec_Ea.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Ea, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("assurances_extrinsic.json", () => {
      const json = getCodecFixtureFile("assurances_extrinsic.json");
      const original = JSON.parse(Buffer.from(json).toString("utf8"));
      const decoded = codec_Ea_JSON.fromJSON(original);
      expect(codec_Ea_JSON.toJSON(decoded)).to.deep.eq(original);
    });
  });
}
