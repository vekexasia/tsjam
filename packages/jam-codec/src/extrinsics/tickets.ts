import { RingVRFProof, TicketExtrinsics } from "@tsjam/types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import {
  ArrayOfJSONCodec,
  BufferJSONCodec,
  createJSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";

/**
 * $(0.6.4 - C.14)
 */
export const codec_Et = createArrayLengthDiscriminator<TicketExtrinsics>({
  encode(
    value: { entryIndex: 0 | 1; proof: RingVRFProof },
    bytes: Uint8Array,
  ): number {
    bytes[0] = value.entryIndex;
    bytes.set(value.proof, 1);
    return 1 + value.proof.length;
  },
  decode(bytes: Uint8Array): {
    value: { entryIndex: 0 | 1; proof: RingVRFProof };
    readBytes: number;
  } {
    return {
      value: {
        entryIndex: bytes[0] as 0 | 1,
        proof: bytes.subarray(1, 1 + 784) as RingVRFProof,
      },
      readBytes: 1 + 784,
    };
  },
  encodedSize(): number {
    return 1 + 784;
  },
});

export const codec_Et_JSON = ArrayOfJSONCodec<
  TicketExtrinsics,
  TicketExtrinsics[0],
  { attempt: number; signature: string }
>(
  createJSONCodec([
    ["entryIndex", "attempt", NumberJSONCodec<0 | 1>()],
    ["proof", "signature", BufferJSONCodec<RingVRFProof, 784>()],
  ]),
);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("codecEt", () => {
    it("tickets_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("tickets_extrinsic.bin");
      const decoded = codec_Et.decode(bin).value;
      expect(codec_Et.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(codec_Et, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("tickets_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("tickets_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const decoded = codec_Et_JSON.fromJSON(json);
      const reencoded = codec_Et_JSON.toJSON(decoded);
      expect(reencoded).deep.eq(json);
    });
  });
}
