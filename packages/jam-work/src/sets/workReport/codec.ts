import {
  createArrayLengthDiscriminator,
  E_2,
  HashCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
} from "@vekexasia/jam-codec";
import { WorkResultCodec } from "@/sets/workResult/codec.js";
import { WorkReport } from "@/sets/workReport/type.js";
import { RefinementContextCodec } from "@/sets/refinementContext/codec.js";
import { CoreIndex } from "@vekexasia/jam-types";
import { AvailabilityCodec } from "@/sets/availabilitySpec/codec.js";

const resultsCodec = createArrayLengthDiscriminator(WorkResultCodec);
export const WorkReportCodec: JamCodec<WorkReport> = {
  encode(value: WorkReport, bytes: Uint8Array): number {
    console.log("son qua dentro", value, bytes);

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
