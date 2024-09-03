import {
  E_4,
  HashCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
  createArrayLengthDiscriminator,
} from "@vekexasia/jam-codec";
import { WorkItem } from "@/workItem.js";
import { WorkPackage } from "@/sets/workPackage/type.js";
import { ServiceIndex } from "@vekexasia/jam-types";
import { WorkItemCodec } from "@/sets/workItem/codec.js";
import { RefinementContextCodec } from "@/sets/refinementContext/codec.js";

const xiCodec = createArrayLengthDiscriminator<WorkItem>(WorkItemCodec);
export const PMemberCodec: JamCodec<WorkPackage> = {
  encode(value: WorkPackage, bytes: Uint8Array): number {
    let offset = LengthDiscrimantedIdentity.encode(
      value.authorizationToken,
      bytes,
    );
    offset += E_4.encode(BigInt(value.serviceIndex), bytes.subarray(offset));
    offset += HashCodec.encode(
      value.authorizationCodeHash,
      bytes.subarray(offset),
    );
    offset += LengthDiscrimantedIdentity.encode(
      value.parametrizationBlob,
      bytes.subarray(offset),
    );
    offset += RefinementContextCodec.encode(
      value.context,
      bytes.subarray(offset),
    );

    offset += xiCodec.encode(value.workItems, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array) {
    let offset = 0;
    const authorizationToken = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizationToken.readBytes;
    const serviceIndex = E_4.decode(bytes.subarray(offset));
    offset += serviceIndex.readBytes;
    const authorizationCodeHash = HashCodec.decode(bytes.subarray(offset));
    offset += authorizationCodeHash.readBytes;
    const parametrizationBlob = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += parametrizationBlob.readBytes;
    const context = RefinementContextCodec.decode(bytes.subarray(offset));
    offset += context.readBytes;
    const workItems = xiCodec.decode(bytes.subarray(offset));
    offset += workItems.readBytes;
    return {
      value: {
        authorizationToken: authorizationToken.value,
        serviceIndex: Number(serviceIndex.value) as ServiceIndex,
        authorizationCodeHash: authorizationCodeHash.value,
        parametrizationBlob: parametrizationBlob.value,
        context: context.value,
        workItems: workItems.value as WorkPackage["workItems"],
      },
      readBytes: offset,
    };
  },
  encodedSize(value: WorkPackage): number {
    return (
      LengthDiscrimantedIdentity.encodedSize(value.authorizationToken) +
      E_4.encodedSize(BigInt(value.serviceIndex)) +
      HashCodec.encodedSize(value.authorizationCodeHash) +
      LengthDiscrimantedIdentity.encodedSize(value.parametrizationBlob) +
      RefinementContextCodec.encodedSize(value.context) +
      xiCodec.encodedSize(value.workItems)
    );
  },
};
