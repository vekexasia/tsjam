import {
  Blake2bHash,
  HeaderHash,
  JamHeader,
  SignedJamHeader,
  StateRootHash,
  Tau,
  ValidatorIndex,
} from "@tsjam/types";
import { UnsignedHeaderCodec } from "@/block/header/unsigned.js";
import assert from "node:assert";
import { BandersnatchSignatureCodec } from "@/identity.js";
import {
  ArrayOfJSONCodec,
  BandersnatchKeyJSONCodec,
  BandersnatchSignatureJSONCodec,
  createJSONCodec,
  Ed25519JSONCodec,
  HashJSONCodec,
  JC_J,
  JSONCodec,
  NULLORCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";
import { TicketIdentifierJSONCodec } from "@/ticketIdentifierCodec";

/**
 * SignedHeaderCodec is a codec for encoding and decoding signed headers
 * it does use the UnsignedHeaderCodec and appends the block seal
 * $(0.6.1 - C.19)
 */
export const SignedHeaderCodec = () => {
  const unsignedHeaderCodec = UnsignedHeaderCodec();
  return {
    decode(bytes: Uint8Array) {
      const unsignedHeader = unsignedHeaderCodec.decode(bytes);
      return {
        value: {
          ...unsignedHeader.value,
          blockSeal: BandersnatchSignatureCodec.decode(
            bytes.subarray(
              unsignedHeader.readBytes,
              unsignedHeader.readBytes + 96,
            ),
          ).value,
        },
        readBytes: unsignedHeader.readBytes + 96,
      };
    },
    encode(value: SignedJamHeader, bytes: Uint8Array): number {
      assert.ok(
        bytes.length >= this.encodedSize(value),
        `SignedHeaderCodec: not enough space in buffer when encoding, expected ${this.encodedSize(value)}, got ${bytes.length}`,
      );
      const consumedBytes = unsignedHeaderCodec.encode(value, bytes);
      BandersnatchSignatureCodec.encode(
        value.blockSeal,
        bytes.subarray(consumedBytes, consumedBytes + 96),
      );
      return consumedBytes + 96;
    },
    encodedSize(value: SignedJamHeader): number {
      return unsignedHeaderCodec.encodedSize(value) + 96;
    },
  };
};

export const SignedHeaderJSONCodec: JSONCodec<
  SignedJamHeader,
  {
    parent: string;
    parent_state_root: string;
    extrinsic_hash: string;
    slot: number;
    epoch_mark: {
      entropy: string;
      tickets_entropy: string;
      validators: string[];
    };
    tickets_mark: null | Array<JC_J<typeof TicketIdentifierJSONCodec>>;
    offenders_mark: string[];
    author_index: number;
    entropy_source: string;
    seal: string;
  }
> = createJSONCodec([
  ["parent", "parent", HashJSONCodec<HeaderHash>()],
  ["priorStateRoot", "parent_state_root", HashJSONCodec<StateRootHash>()],
  ["extrinsicHash", "extrinsic_hash", HashJSONCodec()],
  ["timeSlotIndex", "slot", NumberJSONCodec<Tau>()],
  [
    "epochMarker",
    "epoch_mark",
    NULLORCodec(
      createJSONCodec<NonNullable<SignedJamHeader["epochMarker"]>>([
        ["entropy", "entropy", HashJSONCodec<Blake2bHash>()],
        ["entropy2", "tickets_entropy", HashJSONCodec<Blake2bHash>()],
        [
          "validatorKeys",
          "validators",
          ArrayOfJSONCodec<
            NonNullable<SignedJamHeader["epochMarker"]>["validatorKeys"],
            NonNullable<SignedJamHeader["epochMarker"]>["validatorKeys"][0],
            string
          >(BandersnatchKeyJSONCodec),
        ],
      ]),
    ),
  ],
  [
    "winningTickets",
    "tickets_mark",
    <JSONCodec<JamHeader["winningTickets"]>>(
      NULLORCodec(ArrayOfJSONCodec(TicketIdentifierJSONCodec))
    ),
  ],
  ["offenders", "offenders_mark", ArrayOfJSONCodec(Ed25519JSONCodec)],
  ["blockAuthorKeyIndex", "author_index", NumberJSONCodec<ValidatorIndex>()],
  ["entropySignature", "entropy_source", BandersnatchSignatureJSONCodec],
  ["blockSeal", "seal", BandersnatchSignatureJSONCodec],
]);

if (import.meta.vitest) {
  const { vi, beforeAll, describe, it, expect } = import.meta.vitest;

  const constantMocks = vi.hoisted(() => {
    return {
      NUMBER_OF_VALIDATORS: 6,
      EPOCH_LENGTH: 12,
      MINIMUM_VALIDATORS: (6 * 2) / 3 + 1,
      CORES: 2,
    };
  });
  vi.mock("@tsjam/constants", async (importOriginal) => {
    const toRet = {
      ...(await importOriginal<typeof import("@tsjam/constants")>()),
    };
    Object.defineProperty(toRet, "CORES", {
      get() {
        return constantMocks.CORES;
      },
    });
    Object.defineProperty(toRet, "EPOCH_LENGTH", {
      get() {
        return constantMocks.EPOCH_LENGTH;
      },
    });
    Object.defineProperty(toRet, "MINIMUM_VALIDATORS", {
      get() {
        return constantMocks.MINIMUM_VALIDATORS;
      },
    });
    Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
      get() {
        return constantMocks.NUMBER_OF_VALIDATORS;
      },
    });
    return toRet;
  });
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("SignedHeader", () => {
    let bin: Uint8Array;
    describe("header_0", () => {
      beforeAll(() => {
        bin = getCodecFixtureFile("header_0.bin");
      });
      it("should encode/decode properly", () => {
        const decoded = SignedHeaderCodec().decode(bin).value;
        expect(SignedHeaderCodec().encodedSize(decoded)).toBe(bin.length);
        const reencoded = encodeWithCodec(SignedHeaderCodec(), decoded);
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin).toString("hex"),
        );

        const json = SignedHeaderJSONCodec.fromJSON(
          JSON.parse(
            Buffer.from(getCodecFixtureFile("header_0.json")).toString("utf8"),
          ),
        );

        expect(json).deep.eq(decoded);

        // reencode and compare
        const reencodedJson = SignedHeaderJSONCodec.toJSON(json);
        expect(reencodedJson).deep.eq(
          JSON.parse(
            Buffer.from(getCodecFixtureFile("header_0.json")).toString("utf8"),
          ),
        );
      });
    });
    describe("header_1", () => {
      beforeAll(() => {
        bin = getCodecFixtureFile("header_1.bin");
      });

      it("should encode/decode properly", () => {
        const decoded = SignedHeaderCodec().decode(bin).value;
        expect(SignedHeaderCodec().encodedSize(decoded)).toBe(bin.length);
        const reencoded = encodeWithCodec(SignedHeaderCodec(), decoded);
        expect(Buffer.from(reencoded).toString("hex")).toBe(
          Buffer.from(bin).toString("hex"),
        );

        const json = SignedHeaderJSONCodec.fromJSON(
          JSON.parse(
            Buffer.from(getCodecFixtureFile("header_1.json")).toString("utf8"),
          ),
        );
        expect(json).deep.eq(decoded);

        // reencode and compare
        const reencodedJson = SignedHeaderJSONCodec.toJSON(json);

        expect(reencodedJson).deep.eq(
          JSON.parse(
            Buffer.from(getCodecFixtureFile("header_1.json")).toString("utf8"),
          ),
        );
      });
    });
  });
}
