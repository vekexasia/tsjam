import { JamCodec } from "@/codec.js";
import { CoreIndex, WorkReport } from "@vekexasia/jam-types";
import { HashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { XMemberCodec } from "@/setelements/X.js";
import { SMemberCodec } from "@/setelements/S.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { LMemberCodec } from "@/setelements/L.js";

const resultsCodec = createArrayLengthDiscriminator(LMemberCodec);
export const WMemberCodec: JamCodec<WorkReport> = {
  encode(value: WorkReport, bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.authorizerHash, bytes);
    offset += E.encode(BigInt(value.coreIndex), bytes.subarray(offset));
    offset += LengthDiscrimantedIdentity.encode(
      value.authorizerOutput,
      bytes.subarray(offset),
    );

    offset += XMemberCodec.encode(
      value.refinementContext,
      bytes.subarray(offset),
    );
    offset += SMemberCodec.encode(
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
    const coreIndex = E.decode(bytes.subarray(offset));
    offset += coreIndex.readBytes;
    const authorizerOutput = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizerOutput.readBytes;
    const refinementContext = XMemberCodec.decode(bytes.subarray(offset));
    offset += refinementContext.readBytes;
    const workPackageSpecification = SMemberCodec.decode(
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
      E.encodedSize(BigInt(value.coreIndex)) +
      LengthDiscrimantedIdentity.encodedSize(value.authorizerOutput) +
      XMemberCodec.encodedSize(value.refinementContext) +
      SMemberCodec.encodedSize(value.workPackageSpecification) +
      resultsCodec.encodedSize(value.results)
    );
  },
};
