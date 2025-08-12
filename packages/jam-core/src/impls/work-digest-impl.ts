import {
  BaseJamCodecable,
  BigIntJSONCodec,
  binaryCodec,
  codec,
  createCodec,
  createJSONCodec,
  E_bigint,
  E_int,
  eSubBigIntCodec,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  NumberJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { Gas, Hash, ServiceIndex, u16, u32, WorkDigest } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { WorkOutputImpl } from "./work-output-impl";

/**
 * Identified by `D` set
 * $(0.7.1 - 11.6)
 * $(0.7.1 - C.26) | codec
 */
@JamCodecable()
export class WorkDigestImpl extends BaseJamCodecable implements WorkDigest {
  /**
   * `s`
   * the index of service whose state is to be altered
   */
  @eSubIntCodec(4, "service_id")
  serviceIndex!: ServiceIndex;

  /**
   * `c` - the hash of the code of the sevice at the time of being reported
   * it must be predicted within the work-report according to (153)
   */
  @codec(xBytesCodec(32), "code_hash")
  codeHash!: Hash;

  /**
   * `y` - The hash of the payload which produced this result
   * in the refine stage
   */
  @codec(xBytesCodec(32), "payload_hash")
  payloadHash!: Hash;

  /**
   * `g` -The gas
   */
  @eSubBigIntCodec(8, "accumulate_gas")
  gasLimit!: Gas;

  /**
   * `bold_l` - The output of the service
   */
  @codec(WorkOutputImpl)
  result!: WorkOutputImpl;

  @jsonCodec(
    createJSONCodec<WorkDigest["refineLoad"]>([
      ["gasUsed", "gas_used", BigIntJSONCodec<Gas>()],
      ["importCount", "imports", NumberJSONCodec<u16>()],
      ["extrinsicCount", "extrinsic_count", NumberJSONCodec<u16>()],
      ["extrinsicSize", "extrinsic_size", NumberJSONCodec<u32>()],
      ["exportCount", "exports", NumberJSONCodec<u16>()],
    ]),
    "refine_load",
  )
  @binaryCodec(
    createCodec<WorkDigest["refineLoad"]>([
      ["gasUsed", E_bigint<Gas>()], // u
      ["importCount", E_int<u16>()], // i
      ["extrinsicCount", E_int<u16>()], // x
      ["extrinsicSize", E_int<u32>()], // z
      ["exportCount", E_int<u16>()], // e
    ]),
  )
  refineLoad!: {
    /**
     * `u` - effective gas used when producing this wr in onRefine
     */
    gasUsed: Gas;

    /**
     * `i` - number imported segments
     */
    importCount: u16;

    /**
     * `x`
     */
    extrinsicCount: u16;

    /**
     * `z`
     */
    extrinsicSize: u32;

    /**
     * `e` - number of exported segments
     */
    exportCount: u16;
  };

  constructor(config?: ConditionalExcept<WorkDigestImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("WorkDigestCodec", () => {
    let bin0: Uint8Array;
    let json0: object;
    let bin1: Uint8Array;
    let json1: object;
    beforeAll(() => {
      bin0 = getCodecFixtureFile("work_result_0.bin");
      json0 = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_0.json")).toString("utf8"),
      );
      bin1 = getCodecFixtureFile("work_result_1.bin");
      json1 = JSON.parse(
        Buffer.from(getCodecFixtureFile("work_result_1.json")).toString("utf8"),
      );
    });

    describe("bin0", () => {
      it("should encode/decode properly", () => {
        const decoded = WorkDigestImpl.decode(bin0);
        const reencoded = decoded.value.toBinary();
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin0).toString("hex"),
        );
      });
      it("should encode/decode from JSON", () => {
        const decoded = WorkDigestImpl.fromJSON(json0);
        const reencoded = decoded.toJSON();
        expect(reencoded).toEqual(json0);
      });
    });
    describe("bin1", () => {
      it("should encode/decode properly", () => {
        const decoded = WorkDigestImpl.decode(bin1);
        const reencoded = decoded.value.toBinary();
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin1).toString("hex"),
        );
      });
      it("should encode/decode from JSON", () => {
        const decoded = WorkDigestImpl.fromJSON(json1);
        const reencoded = decoded.toJSON();
        expect(reencoded).toEqual(json1);
      });
    });
  });
}
