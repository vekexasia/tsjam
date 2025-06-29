import {
  Authorization,
  AuthorizationParams,
  ServiceIndex,
  WorkPackage,
} from "@tsjam/types";
import { createLengthDiscriminatedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { WorkContextCodec } from "@/setelements/WorkContextCodec.js";
import { CodeHashCodec } from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { WorkItemCodec } from "@/setelements/WorkItemCodec.js";
import { createCodec } from "@/utils";

/**
 * $(0.6.4 - C.25)
 */
export const WorkPackageCodec = createCodec<WorkPackage>([
  ["authorizationToken", createLengthDiscriminatedIdentity<Authorization>()],
  ["authCodeHost", E_sub_int<ServiceIndex>(4)],
  ["authorizationCodeHash", CodeHashCodec],
  ["paramsBlob", createLengthDiscriminatedIdentity<AuthorizationParams>()],
  ["context", WorkContextCodec],
  [
    "items",
    createArrayLengthDiscriminator<WorkPackage["items"]>(WorkItemCodec),
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
