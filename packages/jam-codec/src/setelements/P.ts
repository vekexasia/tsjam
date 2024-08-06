import { JamCodec } from "@/codec.js";
import { ServiceIndex, WorkItem, WorkPackage } from "@vekexasia/jam-types";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { E_4 } from "@/ints/E_subscr.js";
import { HashCodec } from "@/identity.js";
import { XMemberCodec } from "@/setelements/X.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { IMemberCodec } from "@/setelements/I.js";

const xiCodec = createArrayLengthDiscriminator<WorkItem>(IMemberCodec);
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
    offset += XMemberCodec.encode(value.context, bytes.subarray(offset));

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
    const context = XMemberCodec.decode(bytes.subarray(offset));
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
      XMemberCodec.encodedSize(value.context) +
      xiCodec.encodedSize(value.workItems)
    );
  },
};
