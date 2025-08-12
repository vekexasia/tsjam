import { HashCodec } from "@/codecs/misc-codecs";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  createArrayLengthDiscriminator,
  createJSONCodec,
  E_sub_int,
  eSubBigIntCodec,
  eSubIntCodec,
  JamCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
  lengthDiscriminatedCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { MAX_IMPORTED_ITEMS } from "@tsjam/constants";
import {
  CodeHash,
  ExportingWorkPackageHash,
  Gas,
  Hash,
  MerkleTreeRoot,
  ServiceIndex,
  u16,
  u32,
  UpToSeq,
  WorkItem,
  WorkPayload,
} from "@tsjam/types";
import { isHash } from "@tsjam/utils";

/**
 * $(0.7.0 - C.35) I fn
 */
const importDataSegmentCodec: JamCodec<WorkItemImpl["importSegments"][0]> = {
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
      return {
        value: { root: root as MerkleTreeRoot, index },
        readBytes: 32 + 2,
      };
    }
  },
  encodedSize() {
    return 32 + 2;
  },
};

@JamCodecable()
export class WorkItemExportedSegment extends BaseJamCodecable {
  @codec(HashCodec, "hash")
  blobHash!: Hash;
  @eSubIntCodec(4, "len")
  length!: u32;

  /**
   * $(0.7.1 - 14.14) - X
   */
  originalBlob(): Uint8Array {
    throw new Error("X() not implemented");
  }
}

/**
 * Identified by `W` set
 * $(0.7.1 - 14.3)
 * $(0.7.1 - C.29) | codec
 */
@JamCodecable()
export class WorkItemImpl extends BaseJamCodecable implements WorkItem {
  /**
   * `s` - the service related to the work item
   */
  @eSubIntCodec(4)
  service!: ServiceIndex;

  /**
   * `c` - the code hash of the service a time of the work item creation
   */
  @codec(HashCodec, "code_hash")
  codeHash!: CodeHash;

  /**
   * `g`
   * Gas Limit for the Refine logic
   */
  @eSubBigIntCodec(8, "refine_gas_limit")
  refineGasLimit!: Gas;

  /**
   * `a`
   * Gas limit for the Accumulate logic
   */
  @eSubBigIntCodec(8, "accumulate_gas_limit")
  accumulateGasLimit!: Gas;

  /**
   * `e`
   * - should be &lt; 2^11
   * Number of segments exported by the work item
   */
  @eSubIntCodec(2, "export_count")
  exportCount!: u16;

  /**
   * `bold y` - the payload of the work item
   * Obfuscated/Opaque data fed in the refine logic that should contain info about the work that
   * needs to be done
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(LengthDiscrimantedIdentity)
  payload!: WorkPayload;

  /**
   * `bold i`
   * Sequence of imported Data Segments
   */

  @jsonCodec(
    ArrayOfJSONCodec(
      createJSONCodec([
        ["root", "tree_root", HashCodec],
        ["index", "index", NumberJSONCodec()],
      ]),
    ),
    "import_segments",
  )
  @binaryCodec(createArrayLengthDiscriminator(importDataSegmentCodec))
  importSegments!: UpToSeq<
    {
      /**
       * merkle tree root
       * or hash of the exporting work package. (if tagged)
       */
      root: MerkleTreeRoot | ExportingWorkPackageHash;
      /**
       * index in the merkle tree
       * Codec specifies that its not bigger than 2^15
       */
      index: u16;
    },
    typeof MAX_IMPORTED_ITEMS
  >;

  /**
   * `x`
   * Blob hash and lengths to be introduced in the block.
   */
  @lengthDiscriminatedCodec(WorkItemExportedSegment, "extrinsic")
  exportedDataSegments!: UpToSeq<
    WorkItemExportedSegment,
    typeof MAX_IMPORTED_ITEMS
  >;
}

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("WorkItemCodec", () => {
    let bin: Uint8Array;
    let json: object;
    beforeAll(() => {
      bin = getCodecFixtureFile("work_item.bin");
      json = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_item.json")).toString("utf8"),
      );
    });

    it("should encode/decode properly", () => {
      const decoded = WorkItemImpl.decode(bin);
      const reencoded = decoded.value.toBinary();
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("should encode/decode from JSON", () => {
      const decoded = WorkItemImpl.fromJSON(json);
      const reencoded = decoded.toJSON();
      expect(reencoded).toEqual(json);
    });
  });
}
