import { Gas, ServiceIndex, WorkItem, u32 } from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { HashCodec } from "@/identity.js";
import { E_sub_int, E_sub } from "@/ints/E_subscr.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { createCodec } from "@/utils.js";

/**
 * $(0.5.2 - C.26)
 */
export const WorkItemCodec = createCodec<WorkItem>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["codeHash", HashCodec],
  ["payload", LengthDiscrimantedIdentity],
  ["accumulationGasLimit", E_sub<Gas>(8)],
  // TODO: ["refinementGasLimit", E_sub<Gas>(8)],
  [
    "importedDataSegments",
    createArrayLengthDiscriminator<WorkItem["importedDataSegments"]>(
      createCodec([
        ["root", HashCodec],
        ["index", E_sub_int<u32>(2)],
      ]),
    ),
  ],
  [
    "exportedDataSegments",
    createArrayLengthDiscriminator<WorkItem["exportedDataSegments"]>(
      createCodec([
        ["blobHash", HashCodec],
        ["length", E_sub_int<u32>(4)],
      ]),
    ),
  ],
  ["numberExportedSegments", E_sub_int<u32>(2)],
]);

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("WorkItemCodec", () => {
    let bin: Uint8Array;
    beforeAll(() => {
      bin = getCodecFixtureFile("work_item.bin");
    });

    it("should encode/decode properly", () => {
      const decoded = WorkItemCodec.decode(bin);
      expect(WorkItemCodec.encodedSize(decoded.value)).toBe(bin.length);
      const reencoded = encodeWithCodec(WorkItemCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
