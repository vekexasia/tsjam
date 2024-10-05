import { E_4, E_8 } from "@/ints/E_subscr.js";
import { JamCodec } from "@/codec.js";
import { ServiceIndex, WorkResult, u64 } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { WorkOutputCodec } from "@/setelements/WorkOutputCodec.js";

export const WorkResultCodec: JamCodec<WorkResult> = {
  encode(value: WorkResult, bytes: Uint8Array): number {
    let offset = E_4.encode(BigInt(value.serviceIndex), bytes.subarray(0, 4));
    offset += HashCodec.encode(
      value.codeHash, // c
      bytes.subarray(offset, offset + 32),
    );

    offset += HashCodec.encode(
      value.payloadHash, // l
      bytes.subarray(offset, offset + 32),
    );

    offset += E_8.encode(
      value.gasPrioritization, // g
      bytes.subarray(offset, offset + 8),
    );

    offset += WorkOutputCodec.encode(value.output, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkResult; readBytes: number } {
    let offset = 0;
    const serviceIndex = Number(
      E_4.decode(bytes.subarray(offset, offset + 4)).value,
    ) as ServiceIndex;
    offset += 4;
    const codeHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const payloadHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const gasPrioritization = E_8.decode(bytes.subarray(offset, offset + 8))
      .value as u64;
    offset += 8;
    const output = WorkOutputCodec.decode(bytes.subarray(offset));
    offset += output.readBytes;
    return {
      value: {
        serviceIndex,
        codeHash,
        payloadHash,
        gasPrioritization,
        output: output.value,
      },
      readBytes: offset,
    };
  },
  encodedSize(value: WorkResult): number {
    return 4 + 32 + 32 + 8 + WorkOutputCodec.encodedSize(value.output);
  },
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile, getUTF8FixtureFile, workResultFromJSON } =
    await import("@/test/utils.js");

  describe("WorkResultCodec", () => {
    it("work_result_1.json encoded should match work_result_1.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_1.bin");
      const json = workResultFromJSON(
        JSON.parse(getUTF8FixtureFile("work_result_1.json")),
      );
      const buf = new Uint8Array(WorkResultCodec.encodedSize(json));
      WorkResultCodec.encode(json, buf);
      expect(buf).toStrictEqual(bin);
      expect(WorkResultCodec.decode(bin).value).toStrictEqual(json);
    });
    it("work_result_0.json encoded should match work_result_0.bin (and back)", () => {
      const bin = getCodecFixtureFile("work_result_0.bin");
      const json = workResultFromJSON(
        JSON.parse(getUTF8FixtureFile("work_result_0.json")),
      );
      const buf = new Uint8Array(WorkResultCodec.encodedSize(json));
      WorkResultCodec.encode(json, buf);
      expect(buf).toStrictEqual(bin);
      expect(WorkResultCodec.decode(bin).value).toStrictEqual(json);
    });
  });
}
