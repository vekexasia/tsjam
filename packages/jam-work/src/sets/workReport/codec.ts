import {
  bytesToBigInt,
  createArrayLengthDiscriminator,
  E_2,
  HashCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
} from "@vekexasia/jam-codec";
import { WorkResultCodec } from "@/sets/workResult/codec.js";
import { WorkReport } from "@/sets/workReport/type.js";
import { RefinementContextCodec } from "@/sets/refinementContext/codec.js";
import { CoreIndex, u64 } from "@vekexasia/jam-types";
import { AvailabilityCodec } from "@/sets/availabilitySpec/codec.js";
import { WorkError, WorkResult } from "@/sets/index.js";

const resultsCodec = createArrayLengthDiscriminator(WorkResultCodec);
export const WorkReportCodec: JamCodec<WorkReport> = {
  encode(value: WorkReport, bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.authorizerHash, bytes.subarray(0, 32));
    offset += E_2.encode(
      BigInt(value.coreIndex),
      bytes.subarray(offset, offset + 2),
    );
    offset += LengthDiscrimantedIdentity.encode(
      value.authorizerOutput,
      bytes.subarray(offset),
    );
    offset += RefinementContextCodec.encode(
      value.refinementContext,
      bytes.subarray(offset),
    );
    offset += AvailabilityCodec.encode(
      value.workPackageSpecification,
      bytes.subarray(offset),
    );
    offset += resultsCodec.encode(value.results, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkReport; readBytes: number } {
    let offset = 0;
    const authorizerHash = HashCodec.decode(bytes.subarray(offset));
    offset += authorizerHash.readBytes;
    const coreIndex = E_2.decode(bytes.subarray(offset));
    offset += coreIndex.readBytes;
    const authorizerOutput = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizerOutput.readBytes;
    const refinementContext = RefinementContextCodec.decode(
      bytes.subarray(offset),
    );
    offset += refinementContext.readBytes;
    const workPackageSpecification = AvailabilityCodec.decode(
      bytes.subarray(offset),
    );
    offset += workPackageSpecification.readBytes;
    const results = resultsCodec.decode(bytes.subarray(offset));
    offset += results.readBytes;
    return {
      value: {
        authorizerHash: authorizerHash.value,
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
      AvailabilityCodec.encodedSize(value.workPackageSpecification) +
      resultsCodec.encodedSize(value.results)
    );
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const fs = await import("fs");

  const path = await import("path");
  describe("work_report", () => {
    const bin = fs.readFileSync(
      path.resolve(__dirname, "../../../test/fixtures/work_report.bin"),
    );
    const json = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../../test/fixtures/work_report.json"),
        "utf8",
      ),
    );
    const hexToBytes = (hex: string): Uint8Array => {
      return Buffer.from(hex.slice(2), "hex");
    };
    const hextToBigInt = <T extends bigint>(hex: string): T => {
      return bytesToBigInt(hexToBytes(hex)) as unknown as T;
    };
    it.fails("work_report.json encoded should match work_report.bin", () => {
      const wp: WorkReport = {
        workPackageSpecification: {
          workPackageHash: hextToBigInt(json.package_spec.hash),

          bundleLength: json.package_spec.len,
          erasureRoot: hextToBigInt(json.package_spec.root),
          segmentRoot: hextToBigInt(json.package_spec.segments),
        },
        refinementContext: {
          anchor: {
            headerHash: hextToBigInt(json.context.anchor),
            posteriorStateRoot: hextToBigInt(json.context.state_root),
            posteriorBeefyRoot: hextToBigInt(json.context.beefy_root),
          },
          lookupAnchor: {
            headerHash: hextToBigInt(json.context.lookup_anchor),
            timeSlot: json.context.lookup_anchor_slot,
          },
          requiredWorkPackage: json.context.prerequisite || undefined,
        },
        coreIndex: json.core_index,
        authorizerHash: hextToBigInt(json.authorizer_hash),
        authorizerOutput: hexToBytes(json.auth_output),
        results: json.results.map(
          (r: any): WorkResult => ({
            serviceIndex: r.service,
            codeHash: hextToBigInt(r.code_hash),
            payloadHash: hextToBigInt(r.payload_hash),
            gasPrioritization: BigInt(r.gas_ratio) as u64,
            output: (() => {
              if (r.result.ok) {
                return hexToBytes(r.result.ok);
              }

              if ("out_of_gas" in r.result) {
                return WorkError.OutOfGas;
              }
              if ("panic" in r.result) {
                return WorkError.UnexpectedTermination;
              }
              throw new Error("pd");
            })(),
          }),
        ),
      };
      const b = new Uint8Array(bin.length);
      WorkReportCodec.encode(wp, b);
      expect(WorkReportCodec.encodedSize(wp)).toBe(bin.length);
      expect(Buffer.from(b).toString("hex")).toBe(bin.toString("hex"));
      // check decode now
      const x = WorkReportCodec.decode(b);
      expect(x.value).toEqual(wp);
    });
  });
}
