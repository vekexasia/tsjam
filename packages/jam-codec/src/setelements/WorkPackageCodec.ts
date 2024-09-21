import { WorkPackage } from "@vekexasia/jam-types";
import { JamCodec } from "@/codec.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { E_4 } from "@/ints/E_subscr.js";
import { RefinementContextCodec } from "@/setelements/RefinementContextCodec.js";
import { HashCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { WorkItemCodec } from "@/setelements/WorkItemCodec.js";

const workItemsCodec = createArrayLengthDiscriminator(WorkItemCodec);
export const WorkPackageCodec: JamCodec<WorkPackage> = {
  encode(value: WorkPackage, bytes: Uint8Array): number {
    let offset = LengthDiscrimantedIdentity.encode(
      value.authorizationToken,
      bytes,
    );
    offset += E_4.encode(
      BigInt(value.serviceIndex),
      bytes.subarray(offset, offset + 4),
    );
    offset += HashCodec.encode(
      value.authorizationCodeHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += LengthDiscrimantedIdentity.encode(
      value.parametrizationBlob,
      bytes.subarray(offset),
    );
    offset += RefinementContextCodec.encode(
      value.context,
      bytes.subarray(offset),
    );
    offset += workItemsCodec.encode(value.workItems, bytes.subarray(offset));

    return offset;
  },
  decode(bytes: Uint8Array) {
    let offset = 0;
    const authorizationToken = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += authorizationToken.readBytes;
    const serviceIndex = Number(
      E_4.decode(bytes.subarray(offset, offset + 4)).value,
    );
    offset += 4;
    const authorizationCodeHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const parametrizationBlob = LengthDiscrimantedIdentity.decode(
      bytes.subarray(offset),
    );
    offset += parametrizationBlob.readBytes;
    const context = RefinementContextCodec.decode(bytes.subarray(offset));
    offset += context.readBytes;
    const workItems = workItemsCodec.decode(bytes.subarray(offset));
    offset += workItems.readBytes;
    return {
      value: {
        authorizationToken: authorizationToken.value,
        serviceIndex: serviceIndex as WorkPackage["serviceIndex"],
        authorizationCodeHash,
        parametrizationBlob: parametrizationBlob.value,
        context: context.value,
        workItems: workItems.value,
      } as WorkPackage,
      readBytes: offset,
    };
  },
  encodedSize(v: WorkPackage): number {
    return (
      LengthDiscrimantedIdentity.encodedSize(v.authorizationToken) +
      4 +
      32 +
      LengthDiscrimantedIdentity.encodedSize(v.parametrizationBlob) +
      RefinementContextCodec.encodedSize(v.context) +
      workItemsCodec.encodedSize(v.workItems)
    );
  },
};

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { hexToBytes, hextToBigInt } = await import("@vekexasia/jam-utils");
  const {
    getCodecFixtureFile,
    getUTF8FixtureFile,
    contextFromJSON,
    workItemFromJSON,
  } = await import("@/test/utils.js");
  describe("WorkPackageCodec", () => {
    let item: WorkPackage;
    let bin: Uint8Array;
    beforeAll(() => {
      const json = JSON.parse(getUTF8FixtureFile("work_package.json"));
      item = {
        authorizationToken: hexToBytes(json.authorization),
        context: contextFromJSON(json.context),
        workItems: json.items.map((item: any) => workItemFromJSON(item)),
        authorizationCodeHash: hextToBigInt(json.authorizer.code_hash),
        parametrizationBlob: hexToBytes(json.authorizer.params),
        serviceIndex: json.auth_code_host,
      };
      bin = getCodecFixtureFile("work_package.bin");
    });

    it("should encode properly", () => {
      const bytes = new Uint8Array(WorkPackageCodec.encodedSize(item));
      WorkPackageCodec.encode(item, bytes);
      expect(bytes).toEqual(bin);
    });
    it("should decode properly", () => {
      const { value, readBytes } = WorkPackageCodec.decode(bin);
      expect(value).toEqual(item);
      expect(readBytes).toBe(bin.length);
    });
  });
}
