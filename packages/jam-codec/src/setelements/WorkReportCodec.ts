import {
  Blake2bHash,
  CoreIndex,
  WorkReport,
  WorkResult,
} from "@vekexasia/jam-types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { WorkResultCodec } from "@/setelements/WorkResultCodec.js";
import { JamCodec } from "@/codec.js";
import { RefinementContextCodec } from "@/setelements/RefinementContextCodec.js";
import { E_2 } from "@/ints/E_subscr.js";
import { AvailabilitySpecificationCodec } from "@/setelements/AvailabilitySpecificationCodec.js";
import { HashCodec } from "@/identity.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";

const resultsCodec = createArrayLengthDiscriminator(WorkResultCodec);
export const WorkReportCodec: JamCodec<WorkReport> = {
  encode(value: WorkReport, bytes: Uint8Array): number {
    // s
    let offset = AvailabilitySpecificationCodec.encode(
      value.workPackageSpecification,
      bytes,
    );

    // x
    offset += RefinementContextCodec.encode(
      value.refinementContext,
      bytes.subarray(offset),
    );

    // c
    offset += E_2.encode(
      BigInt(value.coreIndex),
      bytes.subarray(offset, offset + 2),
    );

    // a
    offset += HashCodec.encode(
      value.authorizerHash,
      bytes.subarray(offset, offset + 32),
    );

    // o
    offset += LengthDiscrimantedIdentity.encode(
      value.authorizerOutput,
      bytes.subarray(offset),
    );

    // r
    offset += resultsCodec.encode(value.results, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkReport; readBytes: number } {
    let offset = 0;
    // s
    const workPackageSpecification = AvailabilitySpecificationCodec.decode(
      bytes.subarray(offset),
    );
    offset += workPackageSpecification.readBytes;

    // x
    const refinementContext = RefinementContextCodec.decode(
      bytes.subarray(offset),
    );
    offset += refinementContext.readBytes;

    // c
    const coreIndex = E_2.decode(bytes.subarray(offset));
    offset += coreIndex.readBytes;

    // a
    const authorizerHash = HashCodec.decode(bytes.subarray(offset));
    offset += authorizerHash.readBytes;

    // o
    const authorizerOutput = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizerOutput.readBytes;

    // r
    const results = resultsCodec.decode(bytes.subarray(offset));
    offset += results.readBytes;
    return {
      value: {
        authorizerHash: authorizerHash.value as Blake2bHash,
        coreIndex: Number(coreIndex.value) as CoreIndex,
        authorizerOutput: authorizerOutput.value,
        refinementContext: refinementContext.value,
        workPackageSpecification: workPackageSpecification.value,
        results: results.value as WorkReport["results"],
      },
      readBytes: offset,
    };
  },
  encodedSize(value: WorkReport): number {
    return (
      HashCodec.encodedSize(value.authorizerHash) +
      E_2.encodedSize(BigInt(value.coreIndex)) +
      LengthDiscrimantedIdentity.encodedSize(value.authorizerOutput) +
      RefinementContextCodec.encodedSize(value.refinementContext) +
      AvailabilitySpecificationCodec.encodedSize(
        value.workPackageSpecification,
      ) +
      resultsCodec.encodedSize(value.results)
    );
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { hexToBytes, hextToBigInt } = await import("@vekexasia/jam-utils");
  const {
    getCodecFixtureFile,
    getUTF8FixtureFile,
    contextFromJSON,
    workResultFromJSON,
  } = await import("@/test/utils.js");
  describe("work_report", () => {
    const bin = getCodecFixtureFile("work_report.bin");
    const json = JSON.parse(getUTF8FixtureFile("work_report.json"));
    it("work_report.json encoded should match work_report.bin", () => {
      const wp: WorkReport = {
        workPackageSpecification: {
          workPackageHash: hextToBigInt(json.package_spec.hash),
          bundleLength: json.package_spec.len,
          erasureRoot: hextToBigInt(json.package_spec.root),
          segmentRoot: hextToBigInt(json.package_spec.segments),
        },
        refinementContext: contextFromJSON(json.context),
        coreIndex: json.core_index,
        authorizerHash: hextToBigInt(json.authorizer_hash),
        authorizerOutput: hexToBytes(json.auth_output),
        results: json.results.map(
          (r: any): WorkResult => workResultFromJSON(r),
        ),
      };
      const b = new Uint8Array(bin.length);
      WorkReportCodec.encode(wp, b);
      expect(WorkReportCodec.encodedSize(wp)).toBe(bin.length);
      expect(Buffer.from(b).toString("hex")).toBe(
        new Buffer(bin).toString("hex"),
      );
      // check decode now
      const x = WorkReportCodec.decode(b);
      expect(x.value).toEqual(wp);
    });
  });
}
