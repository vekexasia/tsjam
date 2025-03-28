import { Gas, ServiceIndex, u16, u32, WorkResult } from "@tsjam/types";
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
 * $(0.6.1 - C.23)
 */
export const WorkResultCodec = createCodec<WorkResult>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)], // s
  ["codeHash", HashCodec], // c
  ["payloadHash", HashCodec], // y
  ["gasPrioritization", E_sub<Gas>(8)], // g
  ["output", WorkOutputCodec], // d
  [
    "refineLoad",
    createCodec<WorkResult["refineLoad"]>([
      ["gasUsed", E_bigint<Gas>()], // u
      ["imports", E_int<u16>()], // i
      ["extrinsicCount", E_int<u16>()], // x
      ["extrinsicSize", E_int<u32>()], // z
      ["exports", E_int<u16>()], // e
    ]),
  ],
]);

export const WorkResultJSONCodec = createJSONCodec<
  WorkResult,
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
  ["gasPrioritization", "accumulate_gas", BigIntJSONCodec<Gas>()],
  ["output", "result", WorkOutputJSONCodec],
  [
    "refineLoad",
    "refine_load",
    createJSONCodec<WorkResult["refineLoad"]>([
      ["gasUsed", "gas_used", BigIntJSONCodec<Gas>()],
      ["imports", "imports", NumberJSONCodec<u16>()],
      ["extrinsicCount", "extrinsic_count", NumberJSONCodec<u16>()],
      ["extrinsicSize", "extrinsic_size", NumberJSONCodec<u32>()],
      ["exports", "exports", NumberJSONCodec<u16>()],
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
      const decoded = WorkResultCodec.decode(bin);
      const reencoded = encodeWithCodec(WorkResultCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );

      // test json
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_1.json")).toString("utf8"),
      );
      const decodedJson = WorkResultJSONCodec.fromJSON(json);
      expect(decodedJson).toStrictEqual(decoded.value);
      const reencodedJson = WorkResultJSONCodec.toJSON(decodedJson);
      expect(reencodedJson).toStrictEqual(json);
    });
    it("work_result_0.json encoded should match work_result_0.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_0.bin");
      const decoded = WorkResultCodec.decode(bin);
      const reencoded = encodeWithCodec(WorkResultCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );

      // test json
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_0.json")).toString("utf8"),
      );
      const decodedJson = WorkResultJSONCodec.fromJSON(json);
      expect(decodedJson).toStrictEqual(decoded.value);
      const reencodedJson = WorkResultJSONCodec.toJSON(decodedJson);
      expect(reencodedJson).toStrictEqual(json);
    });
  });
}
