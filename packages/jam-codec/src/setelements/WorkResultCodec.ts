import { Gas, ServiceIndex, WorkResult } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { WorkOutputCodec } from "@/setelements/WorkOutputCodec.js";
import { createCodec } from "@/utils";
import { E_sub, E_sub_int } from "@/ints/E_subscr";

/**
 * $(0.5.3 - C.23)
 */
export const WorkResultCodec = createCodec<WorkResult>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)], // s
  ["codeHash", HashCodec], // c
  ["payloadHash", HashCodec], // l
  ["gasPrioritization", E_sub<Gas>(8)], // g
  ["output", WorkOutputCodec], // o
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
