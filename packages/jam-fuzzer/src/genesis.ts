import { getConstantsMode, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  EpochMarkerValidatorImpl,
  HeaderEpochMarkerImpl,
  HeaderOffenderMarkerImpl,
  JamSignedHeaderImpl,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { Blake2bHash, u32, ValidatorIndex } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { generateDebugKeys } from "./debugKeys";

export const GENESIS = new JamSignedHeaderImpl({
  parent: toTagged(new Uint8Array(32).fill(0)),
  parentStateRoot: toTagged(new Uint8Array(32).fill(0)),
  extrinsicHash: toTagged(new Uint8Array(32).fill(0)),
  slot: <TauImpl>new SlotImpl(<u32>0),
  epochMarker: new HeaderEpochMarkerImpl({
    entropy: <Blake2bHash>new Uint8Array(32).fill(0),
    entropy2: <Blake2bHash>new Uint8Array(32).fill(0),
    validators: toTagged(
      new Array(NUMBER_OF_VALIDATORS).fill(0).map((_, index) => {
        const keys = generateDebugKeys(index);
        return new EpochMarkerValidatorImpl({
          ed25519: keys.ed25519.public,
          bandersnatch: keys.bandersnatch.public,
        });
      }),
    ),
  }),
  offendersMark: new HeaderOffenderMarkerImpl([]),
  authorIndex: <ValidatorIndex>0,
  entropySource: toTagged(new Uint8Array(96).fill(0)),
  seal: toTagged(new Uint8Array(96).fill(0)),
});

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { xBytesCodec } = await import("@tsjam/codec");
  describe.skipIf(getConstantsMode() !== "tiny")("genesis", () => {
    it("genesis should have expected hash", () => {
      expect(xBytesCodec(32).toJSON(GENESIS.signedHash())).eq(
        "0xe864d485113737c28c2fef3b2aed39cb2f289a369b15c54e9c44720bcfdc0ca0",
      );
    });
  });
}
