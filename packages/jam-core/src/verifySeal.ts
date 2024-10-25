import { JamState, SignedJamHeader } from "@tsjam/types";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { Bandersnatch } from "@tsjam/crypto";
import assert from "node:assert";
import {
  EPOCH_LENGTH,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
} from "@tsjam/constants";
import { bigintToBytes, getBlockAuthorKey, isFallbackMode } from "@tsjam/utils";

export const verifySeal = (
  header: SignedJamHeader,
  state: JamState,
): boolean => {
  const encodedHeader = encodeWithCodec(UnsignedHeaderCodec, header);
  const blockAuthorKey = getBlockAuthorKey(header, state);
  if (isFallbackMode(state.safroleState.gamma_s)) {
    return Bandersnatch.verifySignature(
      header.blockSeal,
      blockAuthorKey,
      encodedHeader, // message
      new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...bigintToBytes(state.entropy[3], 32),
      ]), // context
    );
  } else {
    const i = state.safroleState.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    // verify ticket identity. if it fails, it means validator is not allowed to produce block
    assert(
      i.id === Bandersnatch.vrfOutputSignature(header.blockSeal),
      "invalid ticket identity",
    );

    return Bandersnatch.verifySignature(
      header.blockSeal,
      blockAuthorKey,
      encodedHeader, // message,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...bigintToBytes(state.entropy[3], 32),
        i.attempt, // i_r
      ]), // context
    );
    //
  }
};
/**
 * verify `Hv`
 */
export const verifyEntropySignature = (
  header: SignedJamHeader,
  state: JamState,
): boolean => {
  const blockAuthorKey = getBlockAuthorKey(header, state);
  return Bandersnatch.verifySignature(
    header.entropySignature,
    blockAuthorKey,
    new Uint8Array([]), // message - empty to not bias the entropy
    new Uint8Array([
      ...JAM_ENTROPY,
      ...bigintToBytes(Bandersnatch.vrfOutputSignature(header.blockSeal), 32),
    ]),
  );
};
