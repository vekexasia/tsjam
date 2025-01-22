import {
  Dagger,
  EA_Extrinsic,
  JamBlock,
  JamHeader,
  JamState,
  Posterior,
  RHO,
  SafroleState,
  SeqOfLength,
  SignedJamHeader,
  Tau,
  TicketIdentifier,
  Validated,
} from "@tsjam/types";
import { Result, err, ok } from "neverthrow";
import {
  BitSequence,
  UnsignedHeaderCodec,
  codec_Ea,
  codec_Ed,
  codec_Eg_4Hx,
  codec_Ep,
  codec_Et,
  encodeWithCodec,
} from "@tsjam/codec";
import { Bandersnatch, Ed25519, Hashing } from "@tsjam/crypto";
import {
  CORES,
  EPOCH_LENGTH,
  JAM_AVAILABLE,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import {
  bigintToBytes,
  getBlockAuthorKey,
  isFallbackMode,
  isNewEra,
  isSameEra,
  slotIndex,
  toPosterior,
} from "@tsjam/utils";
import { outsideInSequencer } from "@tsjam/transitions";

export const sealSignContext = (
  tau: Tau,
  p_eta3: Posterior<JamState["entropy"][3]>,
  p_gamma_s: Posterior<SafroleState["gamma_s"]>,
) => {
  if (isFallbackMode(p_gamma_s)) {
    return new Uint8Array([...JAM_FALLBACK_SEAL, ...bigintToBytes(p_eta3, 32)]);
  } else {
    const i = p_gamma_s[tau % EPOCH_LENGTH];
    return new Uint8Array([
      ...JAM_TICKET_SEAL,
      ...bigintToBytes(p_eta3, 32),
      i.attempt, // i_r
    ]);
  }
};
/**
 * Verify Hs
 * $(0.5.4 - 6.15 / 6.16 / 6.17 / 6.18 / 6.19 / 6.20)
 */
export const verifySeal = (
  header: SignedJamHeader,
  p_state: Posterior<JamState>,
): boolean => {
  const ha = getBlockAuthorKey(header, toPosterior(p_state.kappa));
  const encodedHeader = encodeWithCodec(UnsignedHeaderCodec, header);
  if (typeof ha === "undefined") {
    // invalid block author key
    return false;
  }
  const verified = Bandersnatch.verifySignature(
    header.blockSeal,
    ha,
    encodedHeader, // message
    sealSignContext(
      header.timeSlotIndex,
      toPosterior(p_state.entropy[3]),
      toPosterior(p_state.safroleState.gamma_s),
    ), // context
  );
  if (!verified) {
    return false;
  }

  // $(0.5.4 - 6.16)
  if (isFallbackMode(p_state.safroleState.gamma_s)) {
    const i = p_state.safroleState.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    if (i !== ha) {
      return false;
    }
    return true;
  } else {
    // $(0.5.4 - 6.15)
    const i = p_state.safroleState.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
    // verify ticket identity. if it fails, it means validator is not allowed to produce block
    if (i.id !== Bandersnatch.vrfOutputSignature(header.blockSeal)) {
      return false;
    }
    return true;
  }
};

/**
 * verify `Hv`
 * @see (0.5.4 - 6.17 - 6.18)
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
 * $(0.5.4 - 6.27)
 */
export const verifyEpochMarker = (
  block: JamBlock,
  curState: JamState,
  p_gamma_k: Posterior<SafroleState["gamma_k"]>,
): Result<undefined, EpochMarkerError> => {
  if (isNewEra(block.header.timeSlotIndex, curState.tau)) {
    if (block.header.epochMarker?.entropy !== curState.entropy[0]) {
      return err(EpochMarkerError.InvalidEntropy);
    }
    if (block.header.epochMarker?.entropy2 !== curState.entropy[1]) {
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

export enum WinningTicketsError {
  WinningTicketsNotEnoughLong = "WinningTicketsNotEnoughLong",
  WinningTicketsNotExpected = "WinningTicketsNotExpected",
  WinningTicketMismatch = "WinningTicketMismatch",
}

// check winning tickets Hw
// $(0.5.4 - 6.28)
export const verifyWinningTickets = (
  block: JamBlock,
  curState: JamState,
  tauTransition: { p_tau: Posterior<Tau>; tau: Tau },
): Result<undefined, WinningTicketsError> => {
  if (
    isSameEra(tauTransition.p_tau, tauTransition.tau) &&
    slotIndex(curState.tau) <= LOTTERY_MAX_SLOT &&
    LOTTERY_MAX_SLOT <= slotIndex(tauTransition.p_tau) &&
    curState.safroleState.gamma_a.length === EPOCH_LENGTH
  ) {
    if (block.header.winningTickets?.length !== EPOCH_LENGTH) {
      return err(WinningTicketsError.WinningTicketsNotEnoughLong);
    }
    const expectedHw = outsideInSequencer(
      curState.safroleState.gamma_a as unknown as SeqOfLength<
        TicketIdentifier,
        typeof EPOCH_LENGTH
      >,
    );
    for (let i = 0; i < EPOCH_LENGTH; i++) {
      if (block.header.winningTickets[i] !== expectedHw[i]) {
        return err(WinningTicketsError.WinningTicketMismatch);
      }
    }
  } else {
    if (typeof block.header.winningTickets !== "undefined") {
      return err(WinningTicketsError.WinningTicketsNotExpected);
    }
  }
  return ok(undefined);
};

// $(0.5.4 - 5.4 / 5.5)
export const verifyExtrinsicHash = (
  extrinsics: JamBlock["extrinsics"],
  hx: JamHeader["extrinsicHash"],
): hx is Validated<JamHeader["extrinsicHash"]> => {
  return hx === computeExtrinsicHash(extrinsics);
};

export const computeExtrinsicHash = (extrinsics: JamBlock["extrinsics"]) => {
  const items = [
    ...Hashing.blake2bBuf(encodeWithCodec(codec_Et, extrinsics.tickets)),
    ...Hashing.blake2bBuf(encodeWithCodec(codec_Ep, extrinsics.preimages)),
    ...Hashing.blake2bBuf(
      encodeWithCodec(codec_Eg_4Hx, extrinsics.reportGuarantees),
    ),
    ...Hashing.blake2bBuf(encodeWithCodec(codec_Ea, extrinsics.assurances)),
    ...Hashing.blake2bBuf(encodeWithCodec(codec_Ed, extrinsics.disputes)),
  ];
  const preimage = new Uint8Array(items);
  return Hashing.blake2b(preimage);
};

/**
 * Verify `Ho`
 * $(0.5.4 - 10.20)
 */
export const verifyOffenders = (
  extrinsics: JamBlock["extrinsics"],
  ho: JamHeader["offenders"],
): ho is Validated<JamHeader["offenders"]> => {
  const allOffenders = new Set(ho);
  for (const c of extrinsics.disputes.culprit) {
    if (!allOffenders.has(c.ed25519PublicKey)) {
      return false;
    }
  }

  for (const f of extrinsics.disputes.faults) {
    if (!allOffenders.has(f.ed25519PublicKey)) {
      return false;
    }
  }

  return true;
};

export const verifyEA = (
  ea: EA_Extrinsic,
  hp: JamHeader["parent"],
  ht: JamHeader["timeSlotIndex"],
  p_kappa: Posterior<JamState["kappa"]>,
  d_rho: Dagger<RHO>,
): ea is Validated<EA_Extrinsic> => {
  // $(0.5.4 - 11.10)
  if (ea.length > NUMBER_OF_VALIDATORS) {
    return false;
  }
  for (let i = 0; i < ea.length; i++) {
    const a = ea[i];
    if (a.validatorIndex >= NUMBER_OF_VALIDATORS) {
      return false;
    }
    if (a.bitstring.length !== CORES) {
      return false;
    }
  }

  // $(0.5.4 - 11.11)
  for (const a of ea) {
    if (a.anchorHash !== hp) {
      return false;
    }
  }

  // $(0.5.4 - 11.12)
  for (let i = 1; i < ea.length; i++) {
    if (ea[i].validatorIndex <= ea[i - 1].validatorIndex) {
      return false;
    }
  }

  // $(0.5.4 - 11.13)
  for (let i = 0; i < ea.length; i++) {
    const a = ea[i];
    const encodedBitSequence = encodeWithCodec(BitSequence, a.bitstring);
    const signatureValid = Ed25519.verifySignature(
      a.signature,
      p_kappa[a.validatorIndex].ed25519,
      new Uint8Array([
        ...JAM_AVAILABLE,
        ...Hashing.blake2bBuf(
          new Uint8Array([
            ...bigintToBytes(a.anchorHash, 32),
            ...encodedBitSequence,
          ]),
        ),
      ]),
    );
    if (!signatureValid) {
      return false;
    }
  }

  // $(0.5.4 - 11.13 / 11.14)
  for (let i = 0; i < ea.length; i++) {
    const a = ea[i];
    for (let c = 0; c < CORES; c++) {
      if (a.bitstring[c] === 1) {
        // af[c]
        if (
          typeof d_rho[c] === "undefined"
          //|| ht > d_rho[c]!.reportTime + WORK_TIMEOUT
        ) {
          return false;
        }
      }
    }
  }
  return true;
};
