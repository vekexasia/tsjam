import { ServiceIndex, WorkItem, WorkPackage } from "@tsjam/types";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { RefinementContextCodec } from "@/setelements/RefinementContextCodec.js";
import { HashCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { WorkItemCodec } from "@/setelements/WorkItemCodec.js";
import { createCodec } from "@/utils";

/**
 * $(0.5.0 - C.25)
 */
export const WorkPackageCodec = createCodec<WorkPackage>([
  ["authorizationToken", LengthDiscrimantedIdentity],
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["authorizationCodeHash", HashCodec],
  ["parametrizationBlob", LengthDiscrimantedIdentity],
  ["context", RefinementContextCodec],
  [
    "workItems",
    createArrayLengthDiscriminator<WorkItem, WorkPackage["workItems"]>(
      WorkItemCodec,
    ),
  ],
]);

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { encodeWithCodec } = await import("@/utils");
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  describe("WorkPackageCodec", () => {
    let bin: Uint8Array;
    beforeAll(() => {
      bin = getCodecFixtureFile("work_package.bin");
    });

    it("should encode/decode properly", () => {
      const decoded = WorkPackageCodec.decode(bin);
      expect(WorkPackageCodec.encodedSize(decoded.value)).toBe(bin.length);
      const reencoded = encodeWithCodec(WorkPackageCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
