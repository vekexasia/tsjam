import {
  ED25519Signature,
  EG_Extrinsic,
  Tau,
  u32,
  ValidatorIndex,
} from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { Ed25519SignatureCodec } from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import {
  WorkReportCodec,
  WorkReportJSON,
  WorkReportJSONCodec,
} from "@/setelements/WorkReportCodec.js";
import { createCodec } from "@/utils.js";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  Ed25519SignatureJSONCodec,
  JSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";

/**
 * $(0.6.1 - C.16)
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

/*
 * $(0.6.1 - 5.6)
 */
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

export const codec_Eg_JSON = <JSONCodec<EG_Extrinsic>>ArrayOfJSONCodec(
  createJSONCodec<
    EG_Extrinsic[0],
    {
      report: WorkReportJSON;
      slot: number;
      signatures: Array<{ validator_index: number; signature: string }>;
    }
  >([
    ["workReport", "report", WorkReportJSONCodec],
    ["timeSlot", "slot", NumberJSONCodec<u32>()],
    [
      "credential",
      "signatures",
      ArrayOfJSONCodec<
        EG_Extrinsic[0]["credential"],
        EG_Extrinsic[0]["credential"][0],
        { validator_index: number; signature: string }
      >(
        createJSONCodec([
          [
            "validatorIndex",
            "validator_index",
            NumberJSONCodec<ValidatorIndex>(),
          ],
          ["signature", "signature", Ed25519SignatureJSONCodec],
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
    it("guarantees_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("guarantees_extrinsic.bin");
      const decoded = codec_Eg.decode(bin).value;
      expect(codec_Eg.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Eg, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("guarantees_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("guarantees_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const decoded = codec_Eg_JSON.fromJSON(json);
      console.log(decoded[0].credential);
      const reencoded = codec_Eg_JSON.toJSON(decoded);
      expect(reencoded).deep.eq(json);
    });
  });
}
