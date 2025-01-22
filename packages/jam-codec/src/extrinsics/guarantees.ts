import { EG_Extrinsic, u32, ValidatorIndex } from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { Ed25519SignatureCodec } from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { WorkReportCodec } from "@/setelements/WorkReportCodec.js";
import { createCodec } from "@/utils.js";

/**
 * $(0.5.4 - C.16)
 */
export const codec_Eg = createArrayLengthDiscriminator<EG_Extrinsic>(
  createCodec<EG_Extrinsic[0]>([
    ["workReport", WorkReportCodec],
    ["timeSlot", E_sub_int<u32>(4)],
    [
      "credential",
      createArrayLengthDiscriminator<EG_Extrinsic[0]["credential"]>(
        createCodec([
          ["validatorIndex", E_sub_int<ValidatorIndex>(2)],
          ["signature", Ed25519SignatureCodec],
        ]),
      ),
    ],
  ]),
);

// $(0.5.4 - 5.6)
export const codec_Eg_4Hx = createArrayLengthDiscriminator<EG_Extrinsic>(
  createCodec<EG_Extrinsic[0]>([
    ["workReport", WorkReportCodec],
    ["timeSlot", E_sub_int<u32>(4)],
    [
      "credential",
      createArrayLengthDiscriminator<EG_Extrinsic[0]["credential"]>(
        createCodec([
          ["validatorIndex", E_sub_int<ValidatorIndex>(2)],
          ["signature", Ed25519SignatureCodec],
        ]),
      ),
    ],
  ]),
);

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
