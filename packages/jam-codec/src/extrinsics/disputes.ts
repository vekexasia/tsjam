import { DisputeExtrinsic, ValidatorIndex, u32 } from "@tsjam/types";
import { MINIMUM_VALIDATORS, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { E_4, E_4_int, E_sub_int } from "@/ints/E_subscr.js";
import {
  Ed25519PubkeyCodec,
  Ed25519SignatureCodec,
  HashCodec,
} from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { createCodec } from "@/utils";
import { createSequenceCodec } from "@/sequenceCodec";

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
 * $(0.5.0 - C.18)
 */
export const codec_Ed = codecEdCreator();

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
    it("disputes_extrinsic.json encoded should match disputes_extrinsic.bin", () => {
      const decoded = codecEdCreator().decode(bin).value;
      expect(codec_Ed.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codecEdCreator(), decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
