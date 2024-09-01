import {
  AssuranceExtrinsic,
  EA_Extrinsic,
} from "@/extrinsics/assurances/extrinsic.js";
import {
  bigintToExistingBytes,
  JamCodec,
  BitSequence,
  HashCodec,
  createArrayLengthDiscriminator,
  Ed25519SignatureCodec,
  bytesToBigInt,
  E_2,
} from "@vekexasia/jam-codec";
import { CORES, ValidatorIndex } from "@vekexasia/jam-types";

const singleExtrinsicCodec: JamCodec<AssuranceExtrinsic> = {
  encode(value: AssuranceExtrinsic, bytes: Uint8Array): number {
    let offset = 0;
    offset += bigintToExistingBytes(
      value.anchorHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += BitSequence.encode(value.bitstring, bytes.subarray(offset));
    offset += E_2.encode(
      BigInt(value.validatorIndex),
      bytes.subarray(offset, offset + 2),
    );
    offset += bigintToExistingBytes(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: AssuranceExtrinsic;
    readBytes: number;
  } {
    const anchorHash = HashCodec.decode(bytes.subarray(0, 32));
    const bitstring = BitSequence.decode(
      bytes.subarray(
        anchorHash.readBytes,
        anchorHash.readBytes + Math.ceil(CORES / 8),
      ),
    );

    const validatorIndex = Number(
      E_2.decode(
        bytes.subarray(
          anchorHash.readBytes + bitstring.readBytes,
          2 + anchorHash.readBytes + bitstring.readBytes,
        ),
      ).value,
    ) as ValidatorIndex;
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(34 + bitstring.readBytes),
    );
    return {
      value: {
        anchorHash: anchorHash.value,
        bitstring: bitstring.value.slice(
          0,
          CORES,
        ) as AssuranceExtrinsic["bitstring"],
        validatorIndex,
        signature: signature.value,
      },
      readBytes: 98 + BitSequence.encodedSize(bitstring.value),
    };
  },
  encodedSize(value: AssuranceExtrinsic): number {
    return 32 + BitSequence.encodedSize(value.bitstring) + 2 + 64;
  },
};

export const codecEa = createArrayLengthDiscriminator(
  singleExtrinsicCodec,
) as unknown as JamCodec<EA_Extrinsic>;

if (import.meta.vitest) {
  const { vi, beforeAll, describe, expect, it } = import.meta.vitest;
  const fs = await import("fs");
  const types = await import("@vekexasia/jam-types");

  const path = await import("path");
  describe("codecEa", () => {
    const bin = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../../test/fixtures/assurances_extrinsic.bin",
      ),
    );
    const json = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../test/fixtures/assurances_extrinsic.json",
        ),
        "utf8",
      ),
    );
    const hexToBytes = (hex: string): Uint8Array => {
      return Buffer.from(hex.slice(2), "hex");
    };
    const hextToBigInt = (hex: string): bigint => {
      return bytesToBigInt(hexToBytes(hex));
    };
    beforeAll(() => {
      vi.spyOn(types, "CORES", "get").mockReturnValue(2 as any);
    });
    it("assurances_extrinsic.json encoded should match assurances_extrinsic.bin", () => {
      const ea: EA_Extrinsic = json.map((e: any) => ({
        anchorHash: hextToBigInt(e.anchor),
        // bitstring: [0, 0, 0, 0, 0, 0, 0, 1] as AssuranceExtrinsic["bitstring"],
        bitstring: [1, 0] as AssuranceExtrinsic["bitstring"],
        validatorIndex: e.validator_index,
        signature: hextToBigInt(e.signature) as AssuranceExtrinsic["signature"],
      }));
      const b = new Uint8Array(bin.length);
      expect(codecEa.encodedSize(ea)).toBe(bin.length);
      codecEa.encode(ea, b);
      expect(Buffer.from(b).toString("hex")).toBe(bin.toString("hex"));
      // check decode now
      const x = codecEa.decode(b);
      expect(x.value).toEqual(ea);
    });
  });
}
