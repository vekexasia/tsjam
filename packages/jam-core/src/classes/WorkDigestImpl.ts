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
  hashCodec,
  JamCodecable,
  jsonCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { Gas, Hash, ServiceIndex, u16, u32, WorkDigest } from "@tsjam/types";
import { WorkOutputImpl } from "./WorkOutputImpl";

// codec order defined in $(0.6.4 - C.26)
@JamCodecable()
export class WorkDigestImpl extends BaseJamCodecable implements WorkDigest {
  @eSubIntCodec(4, "service_id")
  serviceIndex!: ServiceIndex;

  @hashCodec("code_hash")
  codeHash!: Hash;

  @hashCodec("payload_hash")
  payloadHash!: Hash;

  @eSubBigIntCodec(8, "accumulate_gas")
  gasLimit!: Gas;

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
    gasUsed: Gas;
    importCount: u16;
    extrinsicCount: u16;
    extrinsicSize: u32;
    exportCount: u16;
  };
}

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
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
