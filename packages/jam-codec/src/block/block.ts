import { SignedHeaderCodec } from "@/block/header/signed.js";
import { codec_Et } from "@/extrinsics/tickets.js";
import { codec_Ed } from "@/extrinsics/disputes.js";
import { codec_Ep } from "@/extrinsics/preimages.js";
import { codec_Ea } from "@/extrinsics/assurances.js";
import { codec_Eg } from "@/extrinsics/guarantees.js";
import { JamCodec } from "@/codec.js";
import {
  EA_Extrinsic,
  JamBlock,
  ServiceIndex,
  TicketExtrinsics,
} from "@tsjam/types";

export const BlockCodec: JamCodec<JamBlock> = {
  encode(value: JamBlock, bytes: Uint8Array): number {
    let offset = SignedHeaderCodec.encode(value.header, bytes);
    offset += codec_Et.encode(value.extrinsics.tickets, bytes.subarray(offset));
    offset += codec_Ed.encode(
      value.extrinsics.disputes,
      bytes.subarray(offset),
    );
    offset += codec_Ep.encode(
      value.extrinsics.preimages,
      bytes.subarray(offset),
    );
    offset += codec_Ea.encode(
      value.extrinsics.assurances,
      bytes.subarray(offset),
    );

    offset += codec_Eg.encode(
      value.extrinsics.reportGuarantees,
      bytes.subarray(offset),
    );
    return offset;
  },
  decode(bytes: Uint8Array): { value: JamBlock; readBytes: number } {
    let offset = 0;
    const header = SignedHeaderCodec.decode(bytes);
    offset += header.readBytes;
    const tickets = codec_Et.decode(bytes.subarray(offset));
    offset += tickets.readBytes;
    const disputes = codec_Ed.decode(bytes.subarray(offset));
    offset += disputes.readBytes;
    const preimages = codec_Ep.decode(bytes.subarray(offset));
    offset += preimages.readBytes;
    const assurances = codec_Ea.decode(bytes.subarray(offset));
    offset += assurances.readBytes;
    const reportGuarantees = codec_Eg.decode(bytes.subarray(offset));
    offset += reportGuarantees.readBytes;
    return {
      value: {
        header: header.value,
        extrinsics: {
          tickets: tickets.value as TicketExtrinsics,
          disputes: disputes.value,
          preimages: preimages.value,
          assurances: assurances.value as EA_Extrinsic,
          reportGuarantees: reportGuarantees.value,
        },
      },
      readBytes: offset,
    };
  },
  encodedSize(value: JamBlock): number {
    return (
      SignedHeaderCodec.encodedSize(value.header) +
      codec_Et.encodedSize(value.extrinsics.tickets) +
      codec_Ed.encodedSize(value.extrinsics.disputes) +
      codec_Ep.encodedSize(value.extrinsics.preimages) +
      codec_Ea.encodedSize(value.extrinsics.assurances) +
      codec_Eg.encodedSize(value.extrinsics.reportGuarantees)
    );
  },
};

if (import.meta.vitest) {
  const { vi, beforeAll, describe, it, expect } = import.meta.vitest;
  const { hexToBytes } = await import("@tsjam/utils");
  const constants = await import("@tsjam/constants");
  const {
    getCodecFixtureFile,
    getUTF8FixtureFile,
    headerFromJSON,
    disputesExtrinsicFromJSON,
    assurancesExtrinsicFromJSON,
    guaranteesExtrinsicFromJSON,
  } = await import("@/test/utils.js");
  describe("Block", () => {
    let item: JamBlock;
    let bin: Uint8Array;
    beforeAll(() => {
      // @ts-expect-error cores
      vi.spyOn(constants, "CORES", "get").mockReturnValue(2);
      const json = JSON.parse(getUTF8FixtureFile("block.json"));
      item = {
        header: headerFromJSON(json.header),
        extrinsics: {
          tickets: json.extrinsic.tickets.map(
            (t: { attempt: number; signature: string }) => ({
              entryIndex: t.attempt,
              proof: hexToBytes(t.signature),
            }),
          ),
          disputes: disputesExtrinsicFromJSON(json.extrinsic.disputes),
          preimages: json.extrinsic.preimages.map(
            (p: { requester: ServiceIndex; blob: string }) => ({
              serviceIndex: p.requester,
              preimage: hexToBytes(p.blob),
            }),
          ),
          assurances: assurancesExtrinsicFromJSON(json.extrinsic.assurances),
          reportGuarantees: guaranteesExtrinsicFromJSON(
            json.extrinsic.guarantees,
          ),
        },
      };
      bin = getCodecFixtureFile("block.bin");
    });

    it("should encode properly", () => {
      const bytes = new Uint8Array(BlockCodec.encodedSize(item));
      BlockCodec.encode(item, bytes);
      expect(bytes).toEqual(bin);
    });
    it("should decode properly", () => {
      const { value, readBytes } = BlockCodec.decode(bin);
      expect(value).toEqual(item);
      expect(readBytes).toBe(bin.length);
    });
  });
}
