import { BLOCK_TIME } from "@tsjam/constants";
import { merkelizeState } from "@tsjam/merklization";
import { err, ok } from "neverthrow";
import { HeaderHash, JamBlock, JamState, STF } from "@tsjam/types";
import {
  DeltaToPosteriorError,
  DisputesToPosteriorError,
  ETError,
  GammaAError,
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_2_DaggerError,
  RHO_toPosterior,
  authorizerPool_toPosterior,
  deltaToDoubleDagger,
  deltaToPosterior,
  disputesSTF,
  etToIdentifiers,
  gamma_aSTF,
  gamma_sSTF,
  headerLookupHistorySTF,
  recentHistoryToDagger,
  recentHistoryToPosterior,
  rotateEntropy,
  rotateKeys,
  safroleToPosterior,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import { Timekeeping, toPosterior } from "@tsjam/utils";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { EGError, assertEGValid, garantorsReporters } from "@/validateEG.js";
import {
  EpochMarkerError,
  WinningTicketsError,
  verifyEA,
  verifyEntropySignature,
  verifyEpochMarker,
  verifyExtrinsicHash,
  verifyOffenders,
  verifySeal,
  verifyWinningTickets,
} from "@/verifySeal";
import { accumulateReports, availableReports } from "./accumulate";

export enum ImportBlockError {
  InvalidEA = "Invalid EA extrinsic",
  InvalidHx = "Invalid extrinsic hash",
  InvalidSlot = "Invalid slot",
  InvalidSeal = "Invalid seal",
  InvalidEntropySignature = "Invalid entropy signature",
  InvalidEntropy = "Invalid entropy",
  InvalidEpochMarker = "Epoch marker set but not in new epoch",
  InvalidEpochMarkerValidator = "Epoch marker validator key mismatch",
  InvalidOffenders = "Invalid offenders",
  InvalidParentHeader = "Invalid parent header",
  InvalidParentStateRoot = "Invalid parent state root",
  WinningTicketsNotEnoughLong = "Winning tickets not EPOCH long",
  WinningTicketsNotExpected = "Winning tickets set but not expected",
  WinningTicketMismatch = "WInning ticket mismatch",
}

/**
 * the main State Transition Function
 * `Υ` in the paper
 * $(0.6.1 - 4.1)
 */
export const importBlock: STF<
  JamState,
  JamBlock,
  | ImportBlockError
  | GammaAError
  | EGError
  | ETError
  | RHO_2_DaggerError
  | DisputesToPosteriorError
  | EpochMarkerError
  | WinningTicketsError
  | DeltaToPosteriorError
> = (block, curState) => {
  const tauTransition = {
    tau: curState.tau,
    p_tau: toPosterior(block.header.timeSlotIndex),
  };
  const { p_tau } = tauTransition;

  // $(0.6.1 - 5.7)
  if (
    tauTransition.tau >= tauTransition.p_tau &&
    tauTransition.p_tau * BLOCK_TIME < Timekeeping.bigT()
    // && tauTransition.p_tau < 2 ** 32 // NOTE: this is implicit in previous line
  ) {
    return err(ImportBlockError.InvalidSlot);
  }
  const [, p_entropy] = rotateEntropy(
    {
      ...tauTransition,
      vrfOutputHash: Bandersnatch.vrfOutputSignature(
        block.header.entropySignature,
      ),
    },
    curState.entropy,
  ).safeRet();

  const [p_disp_error, p_disputesState] = disputesSTF(
    {
      kappa: curState.kappa,
      lambda: curState.lambda,
      extrinsic: block.extrinsics.disputes,
      curTau: curState.tau,
    },
    curState.disputes,
  ).safeRet();
  if (p_disp_error) {
    return err(p_disp_error);
  }

  const [, [p_gamma_k, p_kappa, p_lambda, p_gamma_z]] = rotateKeys(
    {
      p_psi_o: toPosterior(p_disputesState.psi_o),
      iota: curState.iota,
      ...tauTransition,
    },
    [
      curState.safroleState.gamma_k,
      curState.kappa,
      curState.lambda,
      curState.safroleState.gamma_z,
    ],
  ).safeRet();

  const [etError, ticketIdentifiers] = etToIdentifiers(
    block.extrinsics.tickets,
    {
      p_tau,
      gamma_z: curState.safroleState.gamma_z,
      gamma_a: curState.safroleState.gamma_a,
      p_entropy,
    },
  ).safeRet();
  if (etError) {
    return err(etError);
  }
  const [gamma_sErr, p_gamma_s] = gamma_sSTF(
    {
      ...tauTransition,
      gamma_a: curState.safroleState.gamma_a,
      p_kappa,
      p_eta2: toPosterior(p_entropy[2]),
    },
    curState.safroleState.gamma_s,
  ).safeRet();
  if (gamma_sErr) {
    return err(gamma_sErr);
  }

  const [gamma_aErr, p_gamma_a] = gamma_aSTF(
    {
      ...tauTransition,
      newIdentifiers: ticketIdentifiers,
    },
    curState.safroleState.gamma_a,
  ).safeRet();
  if (gamma_aErr) {
    return err(gamma_aErr);
  }

  const [, p_safroleState] = safroleToPosterior(
    {
      p_gamma_a,
      p_gamma_k,
      p_gamma_s,
      p_gamma_z,
    },
    curState.safroleState,
  ).safeRet();

  const [rhoDaggErr, d_rho] = RHO_2_Dagger(
    p_disputesState,
    curState.rho,
  ).safeRet();
  if (rhoDaggErr) {
    return err(rhoDaggErr);
  }

  const ea = block.extrinsics.assurances;
  const validatedEa = verifyEA(
    ea,
    block.header.parent,
    block.header.timeSlotIndex,
    p_kappa,
    d_rho,
  );
  if (!validatedEa) {
    return err(ImportBlockError.InvalidEA);
  }

  /*
   * Integrate state to calculate several posterior state
   */
  const w = availableReports(ea, d_rho);
  const [
    ,
    {
      accumulateRoot,
      p_accumulationQueue,
      p_accumulationHistory,
      p_privServices,
      d_delta,
      p_iota,
      p_authQueue,
      deferredTransfers,
    },
  ] = accumulateReports(w, {
    tau: tauTransition.tau,
    p_tau: tauTransition.p_tau,
    accumulationHistory: curState.accumulationHistory,
    accumulationQueue: curState.accumulationQueue,
    authQueue: curState.authQueue,
    serviceAccounts: curState.serviceAccounts,
    privServices: curState.privServices,
    iota: curState.iota,
    p_eta_0: toPosterior(p_entropy[0]),
  }).safeRet();

  const [, dd_rho] = RHO2DoubleDagger(
    { p_tau, rho: curState.rho, availableReports: w },
    d_rho,
  ).safeRet();

  const [, d_recentHistory] = recentHistoryToDagger(
    {
      hr: block.header.priorStateRoot,
    },
    curState.recentHistory,
  ).safeRet();

  const [egError, validatedEG] = assertEGValid(
    block.extrinsics.reportGuarantees,
    {
      headerLookupHistory: curState.headerLookupHistory,
      delta: curState.serviceAccounts,
      d_recentHistory,
      recentHistory: curState.recentHistory,
      accumulationHistory: curState.accumulationHistory,
      accumulationQueue: curState.accumulationQueue,
      rho: curState.rho,
      authPool: curState.authPool,
      dd_rho,
      p_tau,
      p_kappa,
      p_lambda,
      p_entropy,
      p_psi_o: toPosterior(p_disputesState.psi_o),
    },
  ).safeRet();
  if (egError) {
    return err(egError);
  }

  const [rhoPostErr, p_rho] = RHO_toPosterior(
    {
      EG_Extrinsic: validatedEG,
      kappa: curState.kappa,
      p_tau,
    },
    dd_rho,
  ).safeRet();
  if (rhoPostErr) {
    return err(rhoPostErr);
  }

  const [, dd_delta] = deltaToDoubleDagger(
    { transfers: deferredTransfers, p_tau },
    d_delta,
  ).safeRet();

  const [pDeltaError, p_delta] = deltaToPosterior(
    {
      EP_Extrinsic: block.extrinsics.preimages,
      delta: curState.serviceAccounts,
      p_tau,
    },
    dd_delta,
  ).safeRet();
  if (pDeltaError) {
    return err(pDeltaError);
  }

  const headerHash = Hashing.blake2b<HeaderHash>(
    encodeWithCodec(UnsignedHeaderCodec, block.header),
  );
  const [, p_recentHistory] = recentHistoryToPosterior(
    {
      accumulateRoot,
      headerHash,
      eg: block.extrinsics.reportGuarantees,
    },
    d_recentHistory,
  ).safeRet();

  const [, p_validatorStatistics] = validatorStatisticsToPosterior(
    {
      extrinsics: block.extrinsics,
      reporters: garantorsReporters({
        extrinsic: block.extrinsics.reportGuarantees,
        p_kappa,
        p_tau,
        p_psi_o: toPosterior(p_disputesState.psi_o),
        p_lambda,
        p_entropy,
      }),
      authorIndex: block.header.blockAuthorKeyIndex,
      p_kappa,
      p_tau: toPosterior(block.header.timeSlotIndex),
      curTau: curState.tau,
    },
    curState.validatorStatistics,
  ).safeRet();

  const [, p_authorizerPool] = authorizerPool_toPosterior(
    {
      p_queue: p_authQueue,
      eg: block.extrinsics.reportGuarantees,
      p_tau: tauTransition.p_tau,
    },
    curState.authPool,
  ).safeRet();

  const [, p_headerLookupHistory] = headerLookupHistorySTF(
    {
      header: block.header,
      headerHash,
    },
    curState.headerLookupHistory,
  ).safeRet();

  const p_state = toPosterior({
    entropy: p_entropy,
    tau: tauTransition.p_tau,
    iota: p_iota as unknown as JamState["iota"],
    authPool: p_authorizerPool,
    authQueue: p_authQueue,
    safroleState: p_safroleState,
    validatorStatistics: p_validatorStatistics,
    rho: p_rho,
    serviceAccounts: p_delta,
    recentHistory: p_recentHistory,
    accumulationQueue: p_accumulationQueue,
    accumulationHistory: p_accumulationHistory,
    privServices: p_privServices,
    lambda: p_lambda,
    kappa: p_kappa,
    disputes: p_disputesState,
    headerLookupHistory: p_headerLookupHistory,
  });

  // $(0.6.1 - 5.2)
  if (
    block.header.parent !==
    curState.recentHistory[curState.recentHistory.length - 1].headerHash
  ) {
    return err(ImportBlockError.InvalidParentHeader);
  }

  // $(0.6.1 - 5.8)
  const prevMerkleRoot = merkelizeState(curState);
  if (prevMerkleRoot !== block.header.priorStateRoot) {
    return err(ImportBlockError.InvalidParentStateRoot);
  }

  if (!verifySeal(block.header, p_state)) {
    return err(ImportBlockError.InvalidSeal);
  }

  if (!verifyEntropySignature(block.header, p_state)) {
    return err(ImportBlockError.InvalidEntropySignature);
  }

  const x = verifyEpochMarker(block, curState, p_gamma_k);
  if (x.isErr()) {
    return err(x.error);
  }

  const wt = verifyWinningTickets(block, curState, tauTransition);
  if (wt.isErr()) {
    return err(wt.error);
  }

  // verifies 5.4 and 5.5
  if (!verifyExtrinsicHash(block.extrinsics, block.header.extrinsicHash)) {
    return err(ImportBlockError.InvalidHx);
  }

  if (!verifyOffenders(block.extrinsics, block.header.offenders)) {
    return err(ImportBlockError.InvalidOffenders);
  }

  return ok(p_state);
};
