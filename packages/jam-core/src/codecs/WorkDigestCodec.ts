import { Gas, ServiceIndex, u16, u32, WorkDigest } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import {
  WorkOutputCodec,
  WorkOutputJSONCodec,
} from "@/setelements/WorkOutputCodec.js";
import { createCodec } from "@/utils";
import { E_sub, E_sub_int } from "@/ints/E_subscr";
import {
  BigIntJSONCodec,
  createJSONCodec,
  HashJSONCodec,
  JC_J,
  NumberJSONCodec,
} from "@/json/JsonCodec";
import { E_bigint, E_int } from "@/ints/e";

/**
 * $(0.6.4 - C.23)
 */
export const WorkDigestCodec = createCodec<WorkDigest>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)], // s
  ["codeHash", HashCodec], // c
  ["payloadHash", HashCodec], // y
  ["gasLimit", E_sub<Gas>(8)], // g
  ["result", WorkOutputCodec], // d
  [
    "refineLoad",
    createCodec<WorkDigest["refineLoad"]>([
      ["gasUsed", E_bigint<Gas>()], // u
      ["importCount", E_int<u16>()], // i
      ["extrinsicCount", E_int<u16>()], // x
      ["extrinsicSize", E_int<u32>()], // z
      ["exportCount", E_int<u16>()], // e
    ]),
  ],
]);

export const WorkDigestJSONCodec = createJSONCodec<
  WorkDigest,
  {
    service_id: number;
    code_hash: string;
    payload_hash: string;
    accumulate_gas: number;
    result: JC_J<typeof WorkOutputJSONCodec>;
    refine_load: {
      gas_used: number;
      imports: number;
      extrinsic_count: number;
      extrinsic_size: number;
      exports: number;
    };
  }
>([
  ["serviceIndex", "service_id", NumberJSONCodec<ServiceIndex>()],
  ["codeHash", "code_hash", HashJSONCodec()],
  ["payloadHash", "payload_hash", HashJSONCodec()],
  ["gasLimit", "accumulate_gas", BigIntJSONCodec<Gas>()],
  ["result", "result", WorkOutputJSONCodec],
  [
    "refineLoad",
    "refine_load",
    createJSONCodec<WorkDigest["refineLoad"]>([
      ["gasUsed", "gas_used", BigIntJSONCodec<Gas>()],
      ["importCount", "imports", NumberJSONCodec<u16>()],
      ["extrinsicCount", "extrinsic_count", NumberJSONCodec<u16>()],
      ["extrinsicSize", "extrinsic_size", NumberJSONCodec<u32>()],
      ["exportCount", "exports", NumberJSONCodec<u16>()],
    ]),
  ],
]);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");

  describe("WorkResultCodec", () => {
    it("work_result_1.json encoded should match work_result_1.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_1.bin");
      const decoded = WorkDigestCodec.decode(bin);
      const reencoded = encodeWithCodec(WorkDigestCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );

      // test json
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_1.json")).toString("utf8"),
      );
      const decodedJson = WorkDigestJSONCodec.fromJSON(json);
      expect(decodedJson).toStrictEqual(decoded.value);
      const reencodedJson = WorkDigestJSONCodec.toJSON(decodedJson);
      expect(reencodedJson).toStrictEqual(json);
    });
    it("work_result_0.json encoded should match work_result_0.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_0.bin");
      const decoded = WorkDigestCodec.decode(bin);
      const reencoded = encodeWithCodec(WorkDigestCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );

      // test json
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_0.json")).toString("utf8"),
      );
      const decodedJson = WorkDigestJSONCodec.fromJSON(json);
      expect(decodedJson).toStrictEqual(decoded.value);
      const reencodedJson = WorkDigestJSONCodec.toJSON(decodedJson);
      expect(reencodedJson).toStrictEqual(json);
    });
  });
}
