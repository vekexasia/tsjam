import {
  Blake2bHash,
  CoreIndex,
  Hash,
  WorkPackageHash,
  WorkReport,
  WorkResult,
} from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import {
  WorkResultCodec,
  WorkResultJSONCodec,
} from "@/setelements/WorkResultCodec.js";
import { JamCodec } from "@/codec.js";
import {
  RefinementContextCodec,
  RefinementContextJSONCodec,
} from "@/setelements/RefinementContextCodec.js";
import { E_2_int } from "@/ints/E_subscr.js";
import {
  AvailabilitySpecificationCodec,
  AvailabilitySpecificationJSONCodec,
} from "@/setelements/AvailabilitySpecificationCodec.js";
import { HashCodec } from "@/identity.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { buildKeyValueCodec } from "@/dicts/keyValue.js";
import { createCodec } from "@/utils";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  HashJSONCodec,
  JC_J,
  MapJSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";

/**
 * $(0.6.1 - C.24)
 */
export const WorkReportCodec = createCodec<WorkReport>([
  // s
  ["workPackageSpecification", AvailabilitySpecificationCodec],
  // x
  ["refinementContext", RefinementContextCodec],
  // c
  ["coreIndex", E_2_int as unknown as JamCodec<CoreIndex>],
  // a
  ["authorizerHash", HashCodec as unknown as JamCodec<Blake2bHash>],
  // o
  ["authorizerOutput", LengthDiscrimantedIdentity],
  // l
  ["segmentRootLookup", buildKeyValueCodec<WorkPackageHash, Hash>(HashCodec)],
  // r
  [
    "results",
    createArrayLengthDiscriminator(WorkResultCodec) as unknown as JamCodec<
      WorkReport["results"]
    >,
  ],
]);

export type WorkReportJSON = {
  package_spec: JC_J<typeof AvailabilitySpecificationJSONCodec>;
  context: JC_J<typeof RefinementContextJSONCodec>;
  core_index: number;
  authorizer_hash: string;
  auth_output: string;
  segment_root_lookup: Array<{
    work_package_hash: string;
    segment_tree_root: string;
  }>;
  results: Array<JC_J<typeof WorkResultJSONCodec>>;
};

export const WorkReportJSONCodec = createJSONCodec<WorkReport, WorkReportJSON>([
  [
    "workPackageSpecification",
    "package_spec",
    AvailabilitySpecificationJSONCodec,
  ],
  ["refinementContext", "context", RefinementContextJSONCodec],
  ["coreIndex", "core_index", NumberJSONCodec<CoreIndex>()],
  ["authorizerHash", "authorizer_hash", HashJSONCodec<Blake2bHash>()],
  ["authorizerOutput", "auth_output", BufferJSONCodec()],
  [
    "segmentRootLookup",
    "segment_root_lookup",
    MapJSONCodec(
      {
        key: "work_package_hash",
        value: "segment_tree_root",
      },
      HashJSONCodec<WorkPackageHash>(),
      HashJSONCodec(),
    ),
  ],
  [
    "results",
    "results",
    ArrayOfJSONCodec<WorkReport["results"], WorkResult>(WorkResultJSONCodec),
  ],
]);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("work_report", () => {
    const bin = getCodecFixtureFile("work_report.bin");
    it("work_report.json encoded should match work_report.bin", () => {
      const decoded = WorkReportCodec.decode(bin);
      expect(WorkReportCodec.encodedSize(decoded.value)).toBe(bin.length);
      const reencoded = encodeWithCodec(WorkReportCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
