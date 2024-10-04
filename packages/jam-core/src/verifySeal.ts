import { SafroleState, SignedJamHeader } from "@vekexasia/jam-types";
import { UnsignedHeaderCodec, encodeWithCodec } from "@vekexasia/jam-codec";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import assert from "node:assert";
import {
  EPOCH_LENGTH,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
} from "@vekexasia/jam-constants";
import {
  bigintToBytes,
  getBlockAuthorKey,
  isFallbackMode,
} from "@vekexasia/jam-utils";

export const verifySeal = (
  header: SignedJamHeader,
  state: SafroleState,
): boolean => {
  const blockAuthorKey = getBlockAuthorKey(header, state);
  if (isFallbackMode(state.gamma_s)) {
    return Bandersnatch.verifySignature(
      header.blockSeal,
      blockAuthorKey,
      encodeWithCodec(UnsignedHeaderCodec, header), // message
      new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...bigintToBytes(state.eta[3], 32),
      ]), // context
    );
  } else {
    const i = state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    // verify ticket identity. if it fails, it means validator is not allowed to produce block
    assert(
      i.id === Bandersnatch.vrfOutputSignature(header.blockSeal),
      "invalid ticket identity",
    );

    return Bandersnatch.verifySignature(
      header.blockSeal,
      blockAuthorKey,
      tmpArray.subarray(0, size), // message,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...bigintToBytes(state.eta[3], 32),
        i.attempt, // i_r
      ]), // context
    );
    //
  }
};
/**
 * verify `Hv`
 * @param header
 * @param state
 */
export const verifyEntropySignature = (
  header: SignedJamHeader,
  state: SafroleState,
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
