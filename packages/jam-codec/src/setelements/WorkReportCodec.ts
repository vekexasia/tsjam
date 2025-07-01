import {
  Blake2bHash,
  CoreIndex,
  Gas,
  Hash,
  WorkPackageHash,
  WorkReport,
  WorkDigest,
} from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import {
  WorkDigestCodec,
  WorkDigestJSONCodec,
} from "@/setelements/WorkDigestCodec.js";
import { JamCodec } from "@/codec.js";
import {
  WorkContextCodec,
  WorkContextJSONCodec,
} from "@/setelements/WorkContextCodec.js";
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
  BigIntJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  HashJSONCodec,
  JC_J,
  MapJSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";
import { E_bigint, E_int } from "@/ints/e";

/**
 * $(0.6.4 - C.24)
 */
export const WorkReportCodec = createCodec<WorkReport>([
  // s
  ["avSpec", AvailabilitySpecificationCodec],
  // bold_c
  ["context", WorkContextCodec],
  // c
  ["core", E_int<CoreIndex>()],
  // a
  ["authorizerHash", HashCodec as unknown as JamCodec<Blake2bHash>],
  // o
  ["authTrace", LengthDiscrimantedIdentity],
  // l
  ["srLookup", buildKeyValueCodec<WorkPackageHash, Hash>(HashCodec)],
  // r
  [
    "digests",
    createArrayLengthDiscriminator(WorkDigestCodec) as unknown as JamCodec<
      WorkReport["digests"]
    >,
  ],
  ["authGasUsed", E_bigint<Gas>()],
]);

export type WorkReportJSON = {
  package_spec: JC_J<typeof AvailabilitySpecificationJSONCodec>;
  context: JC_J<typeof WorkContextJSONCodec>;
  core_index: number;
  authorizer_hash: string;
  auth_output: string;
  segment_root_lookup: Array<{
    work_package_hash: string;
    segment_tree_root: string;
  }>;
  results: Array<JC_J<typeof WorkDigestJSONCodec>>;
  auth_gas_used: number;
};

export const WorkReportJSONCodec = createJSONCodec<WorkReport, WorkReportJSON>([
  ["avSpec", "package_spec", AvailabilitySpecificationJSONCodec],
  ["context", "context", WorkContextJSONCodec],
  ["core", "core_index", NumberJSONCodec<CoreIndex>()],
  ["authorizerHash", "authorizer_hash", HashJSONCodec<Blake2bHash>()],
  ["authTrace", "auth_output", BufferJSONCodec()],
  [
    "srLookup",
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
    "digests",
    "results",
    ArrayOfJSONCodec<
      WorkReport["digests"],
      WorkDigest,
      JC_J<typeof WorkDigestJSONCodec>
    >(WorkDigestJSONCodec),
  ],
  ["authGasUsed", "auth_gas_used", BigIntJSONCodec<Gas>()],
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
