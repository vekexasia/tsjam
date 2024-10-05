import { JamCodec } from "@/codec.js";
import { PVMAccumulationOp } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { WorkOutputCodec } from "@/setelements/WorkOutputCodec.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";

/**
 * todo test this
 */
export const PVMAccumulationOpCodec: JamCodec<PVMAccumulationOp> = {
  encode(value: PVMAccumulationOp, bytes: Uint8Array): number {
    let offset = 0;
    offset += WorkOutputCodec.encode(value.output, bytes.subarray(offset));
    offset += HashCodec.encode(value.payloadHash, bytes.subarray(offset));
    offset += HashCodec.encode(value.packageHash, bytes.subarray(offset));
    offset += LengthDiscrimantedIdentity.encode(
      value.authorizationOutput,
      bytes.subarray(offset),
    );
    return offset;
  },

  decode(bytes: Uint8Array): { value: PVMAccumulationOp; readBytes: number } {
    let offset = 0;
    const output = WorkOutputCodec.decode(bytes.subarray(offset));
    offset += output.readBytes;
    const payloadHash = HashCodec.decode(bytes.subarray(offset));
    offset += payloadHash.readBytes;
    const packageHash = HashCodec.decode(bytes.subarray(offset));
    offset += packageHash.readBytes;
    const authorizationOutput = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizationOutput.readBytes;
    return {
      value: {
        output: output.value,
        payloadHash: payloadHash.value,
        packageHash: packageHash.value,
        authorizationOutput: authorizationOutput.value,
      },
      readBytes: offset,
    };
  },

  encodedSize(value: PVMAccumulationOp): number {
    return (
      WorkOutputCodec.encodedSize(value.output) +
      HashCodec.encodedSize(value.payloadHash) +
      HashCodec.encodedSize(value.packageHash) +
      LengthDiscrimantedIdentity.encodedSize(value.authorizationOutput)
    );
  },
};
