import { DisputeExtrinsic, u32, ValidatorIndex } from "@tsjam/types";
import { MINIMUM_VALIDATORS } from "@tsjam/constants";
import { E_4_int, E_sub_int } from "@/ints/E_subscr.js";
import {
  Ed25519PubkeyCodec,
  Ed25519SignatureCodec,
  HashCodec,
} from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { createCodec } from "@/utils";
import { createSequenceCodec } from "@/sequenceCodec";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  Ed25519PublicKeyJSONCodec,
  Ed25519SignatureJSONCodec,
  HashJSONCodec,
  JSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";

const codecEdCreator = () => {
  return createCodec<DisputeExtrinsic>([
    [
      "verdicts",
      createArrayLengthDiscriminator<DisputeExtrinsic["verdicts"]>(
        createCodec([
          ["hash", HashCodec],
          ["epochIndex", E_4_int],
          [
            "judgements",
            createSequenceCodec<DisputeExtrinsic["verdicts"][0]["judgements"]>(
              MINIMUM_VALIDATORS,
              createCodec([
                ["validity", E_sub_int<0 | 1>(1)],
                ["validatorIndex", E_sub_int<ValidatorIndex>(2)],
                ["signature", Ed25519SignatureCodec],
              ]),
            ),
          ],
        ]),
      ),
    ],
    [
      "culprit",
      createArrayLengthDiscriminator<DisputeExtrinsic["culprit"]>(
        createCodec([
          ["hash", HashCodec],
          ["ed25519PublicKey", Ed25519PubkeyCodec],
          ["signature", Ed25519SignatureCodec],
        ]),
      ),
    ],
    [
      "faults",
      createArrayLengthDiscriminator<DisputeExtrinsic["faults"]>(
        createCodec([
          ["hash", HashCodec],
          ["validity", E_sub_int<0 | 1>(1)],
          ["ed25519PublicKey", Ed25519PubkeyCodec],
          ["signature", Ed25519SignatureCodec],
        ]),
      ),
    ],
  ]);
};
/**
 * `Ed` codec
 * $(0.6.4 - C.18)
 */
export const codec_Ed = codecEdCreator();

const BooleanCodec: JSONCodec<0 | 1, boolean> = {
  fromJSON(json) {
    return json ? 1 : 0;
  },
  toJSON(value) {
    return value === 1;
  },
};

export const codec_Ed_JSON: JSONCodec<
  DisputeExtrinsic,
  {
    verdicts: Array<{
      target: string;
      age: number;
      votes: Array<{ vote: boolean; index: number; signature: string }>;
    }>;
    culprits: Array<{ target: string; key: string; signature: string }>;
    faults: Array<{
      target: string;
      vote: boolean;
      key: string;
      signature: string;
    }>;
  }
> = createJSONCodec([
  [
    "verdicts",
    "verdicts",
    ArrayOfJSONCodec<
      DisputeExtrinsic["verdicts"],
      DisputeExtrinsic["verdicts"][0],
      {
        target: string;
        age: number;
        votes: Array<{ vote: boolean; index: number; signature: string }>;
      }
    >(
      createJSONCodec([
        ["hash", "target", HashJSONCodec()],
        ["epochIndex", "age", NumberJSONCodec<u32>()],
        [
          "judgements",
          "votes",
          ArrayOfJSONCodec<
            DisputeExtrinsic["verdicts"][0]["judgements"],
            DisputeExtrinsic["verdicts"][0]["judgements"][0],
            { vote: boolean; index: number; signature: string }
          >(
            createJSONCodec([
              ["validity", "vote", BooleanCodec],
              ["validatorIndex", "index", NumberJSONCodec<ValidatorIndex>()],
              ["signature", "signature", Ed25519SignatureJSONCodec],
            ]),
          ),
        ],
      ]),
    ),
  ],
  [
    "culprit",
    "culprits",
    ArrayOfJSONCodec<
      DisputeExtrinsic["culprit"],
      DisputeExtrinsic["culprit"][0],
      { target: string; key: string; signature: string }
    >(
      createJSONCodec([
        ["hash", "target", HashJSONCodec()],
        ["ed25519PublicKey", "key", Ed25519PublicKeyJSONCodec],
        ["signature", "signature", Ed25519SignatureJSONCodec],
      ]),
    ),
  ],
  [
    "faults",
    "faults",
    ArrayOfJSONCodec<
      DisputeExtrinsic["faults"],
      DisputeExtrinsic["faults"][0],
      {
        target: string;
        vote: boolean;
        key: string;
        signature: string;
      }
    >(
      createJSONCodec([
        ["hash", "target", HashJSONCodec()],
        ["validity", "vote", BooleanCodec],
        ["ed25519PublicKey", "key", Ed25519PublicKeyJSONCodec],
        ["signature", "signature", Ed25519SignatureJSONCodec],
      ]),
    ),
  ],
]);

if (import.meta.vitest) {
  const { vi, beforeAll, describe, expect, it } = import.meta.vitest;
  const constants = await import("@tsjam/constants");
  const { encodeWithCodec } = await import("@/utils");
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  describe("codecED", () => {
    beforeAll(() => {
      // @ts-expect-error validators
      vi.spyOn(constants, "NUMBER_OF_VALIDATORS", "get").mockReturnValue(6);
      vi.spyOn(constants, "MINIMUM_VALIDATORS", "get").mockReturnValue(
        ((6 * 2) / 3 + 1) as 683,
      );
    });

    const bin = getCodecFixtureFile("disputes_extrinsic.bin");
    const json = getCodecFixtureFile("disputes_extrinsic.json");
    it("disputes_extrinsic.json encoded should match disputes_extrinsic.bin", () => {
      const decoded = codecEdCreator().decode(bin).value;
      expect(codec_Ed.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codecEdCreator(), decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("disputes_extrinsic.json should be the same encoded and decoded", () => {
      const original = JSON.parse(Buffer.from(json).toString("utf8"));
      const decoded = codec_Ed_JSON.fromJSON(original);
      const decodedBin = codecEdCreator().decode(bin).value;
      expect(decoded.verdicts, "bin and json encoding").deep.eq(
        decodedBin.verdicts,
      );

      const reencoded = codec_Ed_JSON.toJSON(decoded);
      expect(reencoded).deep.eq(original);
    });
  });
}
