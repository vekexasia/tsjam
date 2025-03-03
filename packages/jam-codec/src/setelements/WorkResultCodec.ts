import { Gas, ServiceIndex, WorkResult } from "@tsjam/types";
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

/**
 * $(0.6.1 - C.23)
 */
export const WorkResultCodec = createCodec<WorkResult>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)], // s
  ["codeHash", HashCodec], // c
  ["payloadHash", HashCodec], // l
  ["gasPrioritization", E_sub<Gas>(8)], // g
  ["output", WorkOutputCodec], // o
]);

export const WorkResultJSONCodec = createJSONCodec<
  WorkResult,
  {
    service_id: number;
    code_hash: string;
    payload_hash: string;
    accumulate_gas: number;
    result: JC_J<typeof WorkOutputJSONCodec>;
  }
>([
  ["serviceIndex", "service_id", NumberJSONCodec<ServiceIndex>()],
  ["codeHash", "code_hash", HashJSONCodec()],
  ["payloadHash", "payload_hash", HashJSONCodec()],
  ["gasPrioritization", "accumulate_gas", BigIntJSONCodec<Gas>()],
  ["output", "result", WorkOutputJSONCodec],
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
    });
    it("work_result_0.json encoded should match work_result_0.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_0.bin");
      const decoded = WorkResultCodec.decode(bin);
      const reencoded = encodeWithCodec(WorkResultCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
