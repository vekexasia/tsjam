import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  bigintCodec,
  binaryCodec,
  BufferJSONCodec,
  buildKeyValueCodec,
  codec,
  createArrayLengthDiscriminator,
  E,
  E_int,
  HashCodec,
  hashCodec,
  HashJSONCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import {
  Blake2bHash,
  BoundedSeq,
  CoreIndex,
  Gas,
  Hash,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import { WorkDigestImpl } from "./WorkDigestImpl";
import { AvailabilitySpecificationImpl } from "./AvailabilitySpecificationImpl";
import { WorkContextImpl } from "./WorkContextImpl";

// codec order defined in $(0.7.0 - C.27)
@JamCodecable()
export class WorkReportImpl extends BaseJamCodecable implements WorkReport {
  /**
   * `bold_s`
   */
  @codec(AvailabilitySpecificationImpl, "package_spec")
  avSpec!: AvailabilitySpecificationImpl;

  /**
   * `bold_c`
   */
  @codec(WorkContextImpl)
  context!: WorkContextImpl;

  /**
   * `c`
   */

  @jsonCodec(NumberJSONCodec(), "core_index")
  @binaryCodec(E_int())
  core!: CoreIndex;

  /**
   * `a`
   */
  @hashCodec("authorizer_hash")
  authorizerHash!: Blake2bHash;

  /**
   * `g`
   */
  @jsonCodec(NumberJSONCodec(), "auth_gas_used")
  @binaryCodec(E)
  authGasUsed!: Gas;

  /**
   * `bold_t`
   */
  @jsonCodec(BufferJSONCodec(), "auth_output")
  @binaryCodec(LengthDiscrimantedIdentity)
  authTrace!: Uint8Array;

  /**
   * `bold_l`
   */
  @jsonCodec(
    MapJSONCodec(
      { key: "work_package_hash", value: "segment_tree_root" },
      HashJSONCodec(),
      HashJSONCodec(),
    ),
    "segment_root_lookup",
  )
  @binaryCodec(buildKeyValueCodec(HashCodec))
  srLookup!: Map<WorkPackageHash, Hash>;

  /**
   * `bold_d`
   */
  @jsonCodec(ArrayOfJSONCodec(WorkDigestImpl), "results")
  @binaryCodec(createArrayLengthDiscriminator(WorkDigestImpl))
  digests!: BoundedSeq<WorkDigestImpl, 1, typeof MAXIMUM_WORK_ITEMS>;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");

  describe("WorkReportImpl", () => {
    describe("codec", () => {
      it("should encode/decode binary", () => {
        const bin = getCodecFixtureFile("work_report.bin");
        const value = WorkReportImpl.decode<WorkReportImpl>(bin).value;
        const reencoded = value.toBinary();
        expect(Buffer.from(reencoded).toString("hex")).toEqual(
          Buffer.from(bin).toString("hex"),
        );
      });
      it("should encode/decode json", () => {
        const json = JSON.parse(
          Buffer.from(getCodecFixtureFile("work_report.json")).toString("utf8"),
        );
        const decoded = WorkReportImpl.fromJSON<WorkReportImpl>(json).toJSON();
        expect(decoded).deep.eq(json);
      });
    });
  });
}
