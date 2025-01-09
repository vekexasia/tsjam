import {
  Gas,
  ExportingWorkPackageHash,
  ServiceIndex,
  WorkItem,
  u32,
  u16,
} from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { HashCodec } from "@/identity.js";
import { E_sub_int, E_sub } from "@/ints/E_subscr.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
import { createCodec } from "@/utils.js";
import { JamCodec } from "@/codec";
import { isHash } from "@tsjam/utils";

export const importDataSegmentCodec: JamCodec<
  WorkItem["importedDataSegments"][0]
> = {
  encode(value, bytes) {
    const root = value.root;
    if (!isHash(root)) {
      let offset = HashCodec.encode(root.value, bytes.subarray(0, 32));
      offset += E_sub_int<number>(2).encode(
        value.index + 2 ** 15,
        bytes.subarray(offset),
      );
      return offset;
    } else {
      let offset = HashCodec.encode(root, bytes.subarray(0, 32));
      offset += E_sub_int<number>(2).encode(
        value.index,
        bytes.subarray(offset),
      );
      return offset;
    }
  },
  decode(bytes) {
    const { value: root } = HashCodec.decode(bytes.subarray(0, 32));
    const { value: index } = E_sub_int<u16>(2).decode(bytes.subarray(32));
    if (index > 2 ** 15) {
      return {
        value: {
          root: <ExportingWorkPackageHash>{ value: root },
          index: <u16>(index - 2 ** 15),
        },
        readBytes: 32 + 2,
      };
    } else {
      return { value: { root, index }, readBytes: 32 + 2 };
    }
  },
  encodedSize() {
    return 32 + 2;
  },
};

/**
 * $(0.5.3 - C.26)
 */
export const WorkItemCodec = createCodec<WorkItem>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["codeHash", HashCodec],
  ["payload", LengthDiscrimantedIdentity],
  ["refinementGasLimit", E_sub<Gas>(8)], // g
  ["accumulationGasLimit", E_sub<Gas>(8)], // a
  [
    "importedDataSegments",
    createArrayLengthDiscriminator<WorkItem["importedDataSegments"]>(
      importDataSegmentCodec,
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
      expect(decoded.readBytes).toBe(bin.length);
      expect(WorkItemCodec.encodedSize(decoded.value)).toBe(bin.length);
      const reencoded = encodeWithCodec(WorkItemCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
