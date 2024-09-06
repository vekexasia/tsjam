import { RingVRFProof, TicketExtrinsics } from "@vekexasia/jam-types";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";

export const codec_Et = createArrayLengthDiscriminator<TicketExtrinsics[0]>({
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
  encodedSize: function (value: {
    entryIndex: 0 | 1;
    proof: RingVRFProof;
  }): number {
    return 1 + 784;
  },
});

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const fs = await import("fs");

  const { hexToBytes } = await import("@vekexasia/jam-utils");
  const path = await import("path");
  describe("codecEt", () => {
    const bin = fs.readFileSync(
      path.resolve(__dirname, "../../test/fixtures/tickets_extrinsic.bin"),
    );
    const json = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../test/fixtures/tickets_extrinsic.json"),
        "utf8",
      ),
    );
    it("tickets_extrinsic.json encoded should match tickets_extrinsic.bin", () => {
      const preimage: TicketExtrinsics = json.map((e: any) => ({
        entryIndex: e.attempt,
        proof: hexToBytes(e.signature),
      }));
      const b = new Uint8Array(bin.length);
      codec_Et.encode(preimage, b);
      expect(codec_Et.encodedSize(preimage)).toBe(bin.length);
      expect(Buffer.from(b).toString("hex")).toBe(bin.toString("hex"));
      // check decode now
      const x = codec_Et.decode(b);
      expect(x.value).toEqual(preimage);
    });
  });
}
