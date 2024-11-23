import {
  JamBlock,
  JamEntropy,
  JamState,
  Posterior,
  SafroleState,
  SignedJamHeader,
} from "@tsjam/types";
import { Result, err, ok } from "neverthrow";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { Bandersnatch } from "@tsjam/crypto";
import assert from "node:assert";
import {
  EPOCH_LENGTH,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
} from "@tsjam/constants";
import {
  bigintToBytes,
  getBlockAuthorKey,
  isFallbackMode,
  isNewEra,
  toPosterior,
} from "@tsjam/utils";

/**
 * Verify Hs
 * $(0.5.0 - 6.15 / 6.16 / 6.17 / 6.18 / 6.19 / 6.20)
 */
export const verifySeal = (
  header: SignedJamHeader,
  p_state: Posterior<JamState>,
): boolean => {
  const encodedHeader = encodeWithCodec(UnsignedHeaderCodec, header);
  const ha = getBlockAuthorKey(header, toPosterior(p_state.kappa));
  if (typeof ha === "undefined") {
    // invalid block author key
    return false;
  }
  // $(0.5.0 - 6.16)
  if (isFallbackMode(p_state.safroleState.gamma_s)) {
    const verified = Bandersnatch.verifySignature(
      header.blockSeal,
      ha,
      encodedHeader, // message
      new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...bigintToBytes(p_state.entropy[3], 32),
      ]), // context
    );
    if (!verified) {
      return false;
    }
    const i = p_state.safroleState.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    if (i !== ha) {
      return false;
    }
    return true;
  } else {
    // $(0.5.0 - 6.15)
    const i = p_state.safroleState.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    // verify ticket identity. if it fails, it means validator is not allowed to produce block
    if (i.id !== Bandersnatch.vrfOutputSignature(header.blockSeal)) {
      return false;
    }

    return Bandersnatch.verifySignature(
      header.blockSeal,
      ha,
      encodedHeader, // message,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...bigintToBytes(p_state.entropy[3], 32),
        i.attempt, // i_r
      ]), // context
    );
    //
  }
};

/**
 * verify `Hv`
 * @see (0.5.0 - 6.17 - 6.18)
 */
export const verifyEntropySignature = (
  header: SignedJamHeader,
  state: Posterior<JamState>,
): boolean => {
  const ha = getBlockAuthorKey(header, toPosterior(state.kappa));
  if (typeof ha === "undefined") {
    // invalid block author key
    return false;
  }
  return Bandersnatch.verifySignature(
    header.entropySignature,
    ha,
    new Uint8Array([]), // message - empty to not bias the entropy
    new Uint8Array([
      ...JAM_ENTROPY,
      ...bigintToBytes(Bandersnatch.vrfOutputSignature(header.blockSeal), 32),
    ]),
  );
};

export enum EpochMarkerError {
  InvalidEntropy = "InvalidEntropy",
  InvalidEpochMarkerValidator = "InvalidEpochMarkerValidator",
  InvalidEpochMarker = "InvalidEpochMarker",
}

/**
 * Verifies epoch marker `He` is valid
 * $(0.5.0 - 6.27)
 */
export const verifyEpochMarker = (
  block: JamBlock,
  curState: JamState,
  p_entropy: Posterior<JamEntropy>,
  p_gamma_k: Posterior<SafroleState["gamma_k"]>,
): Result<undefined, EpochMarkerError> => {
  if (isNewEra(block.header.timeSlotIndex, curState.tau)) {
    if (block.header.epochMarker?.entropy !== p_entropy[1]) {
      return err(EpochMarkerError.InvalidEntropy);
    }
    for (let i = 0; i < block.header.epochMarker!.validatorKeys.length; i++) {
      if (
        block.header.epochMarker!.validatorKeys[i] !== p_gamma_k[i].banderSnatch
      ) {
        return err(EpochMarkerError.InvalidEpochMarkerValidator);
      }
    }
  } else {
    if (typeof block.header.epochMarker !== "undefined") {
      return err(EpochMarkerError.InvalidEpochMarker);
    }
  }
  return ok(undefined);
};
