import { SignedHeaderCodec } from "@/block/header/signed.js";
import { codec_Et } from "@/extrinsics/tickets.js";
import { codec_Ed } from "@/extrinsics/disputes.js";
import { codec_Ep } from "@/extrinsics/preimages.js";
import { codec_Ea } from "@/extrinsics/assurances.js";
import { codec_Eg } from "@/extrinsics/guarantees.js";
import { JamCodec } from "@/codec.js";
import { EA_Extrinsic, JamBlock, TicketExtrinsics } from "@tsjam/types";

/**
 * Codec for block extrinsic. used in both block serialiation and computing `Hx`
 * order is defined in $(0.5.0 - C.13)
 */
export const ExtrinsicsCodec: JamCodec<JamBlock["extrinsics"]> = {
  encode(value, bytes) {
    let offset = 0;
    offset += codec_Et.encode(value.tickets, bytes.subarray(offset));
    offset += codec_Ep.encode(value.preimages, bytes.subarray(offset));
    offset += codec_Eg.encode(value.reportGuarantees, bytes.subarray(offset));
    offset += codec_Ea.encode(value.assurances, bytes.subarray(offset));
    offset += codec_Ed.encode(value.disputes, bytes.subarray(offset));
    return offset;
  },
  decode(bytes) {
    let offset = 0;
    const tickets = codec_Et.decode(bytes.subarray(offset));
    offset += tickets.readBytes;
    const preimages = codec_Ep.decode(bytes.subarray(offset));
    offset += preimages.readBytes;
    const reportGuarantees = codec_Eg.decode(bytes.subarray(offset));
    offset += reportGuarantees.readBytes;
    const assurances = codec_Ea.decode(bytes.subarray(offset));
    offset += assurances.readBytes;
    const disputes = codec_Ed.decode(bytes.subarray(offset));
    offset += disputes.readBytes;
    return {
      value: {
        tickets: tickets.value as TicketExtrinsics,
        disputes: disputes.value,
        preimages: preimages.value,
        assurances: assurances.value as EA_Extrinsic,
        reportGuarantees: reportGuarantees.value,
      },
      readBytes: offset,
    };
  },
  encodedSize(value) {
    return (
      codec_Et.encodedSize(value.tickets) +
      codec_Ed.encodedSize(value.disputes) +
      codec_Ep.encodedSize(value.preimages) +
      codec_Ea.encodedSize(value.assurances) +
      codec_Eg.encodedSize(value.reportGuarantees)
    );
  },
};

/**
 * Block codec
 * $(0.5.0 - C.13)
 */
export const BlockCodec: JamCodec<JamBlock> = {
  encode(value: JamBlock, bytes: Uint8Array): number {
    let offset = SignedHeaderCodec.encode(value.header, bytes);
    offset += ExtrinsicsCodec.encode(value.extrinsics, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: JamBlock; readBytes: number } {
    let offset = 0;
    const header = SignedHeaderCodec.decode(bytes);
    offset += header.readBytes;
    const extrinsics = ExtrinsicsCodec.decode(bytes.subarray(offset));
    offset += extrinsics.readBytes;

    return {
      value: {
        header: header.value,
        extrinsics: extrinsics.value,
      },
      readBytes: offset,
    };
  },
  encodedSize(value: JamBlock): number {
    return (
      SignedHeaderCodec.encodedSize(value.header) +
      ExtrinsicsCodec.encodedSize(value.extrinsics)
    );
  },
};

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const constants = await import("@tsjam/constants");
  const { encodeWithCodec } = await import("@/utils");
  describe("Block", () => {
    const bin = getCodecFixtureFile("block.bin");
    it("should match block.bin", () => {
      vi.spyOn(constants, "CORES", "get").mockReturnValue(<any>2);
      vi.spyOn(constants, "EPOCH_LENGTH", "get").mockReturnValue(<any>12);
      vi.spyOn(constants, "NUMBER_OF_VALIDATORS", "get").mockReturnValue(
        <any>6,
      );
      const decoded = BlockCodec.decode(bin).value;
      expect(BlockCodec.encodedSize(decoded)).toBe(bin.length);
      const reencoded = encodeWithCodec(BlockCodec, decoded);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
