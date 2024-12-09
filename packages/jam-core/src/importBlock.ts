import {
  BLOCK_TIME,
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_PER_CORE,
} from "@tsjam/constants";
import { merkelizeState } from "@tsjam/merklization";
import { err, ok } from "neverthrow";
import { Dagger, Delta, Gas, JamBlock, JamState, STF } from "@tsjam/types";
import {
  DeltaToPosteriorError,
  DisputesToPosteriorError,
  ETError,
  GammaAError,
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_2_DaggerError,
  RHO_toPosterior,
  accumulationHistoryToPosterior,
  accumulationQueueToPosterior,
  authorizerPool_toPosterior,
  calculateAccumulateRoot,
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
import { Timekeeping, toPosterior, toTagged } from "@tsjam/utils";
import { Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { EGError, assertEGValid } from "@/validateEG.js";
import {
  accumulatableReports,
  availableReports,
  noPrereqAvailableReports,
  outerAccumulation,
  withPrereqAvailableReports,
} from "@tsjam/pvm";
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
 * $(0.5.0 - 4.1)
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

  // $(0.5.0 - 5.7)
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
      h_v: block.header.entropySignature,
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
      p_tau: tauTransition.p_tau,
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
      gamma_s: curState.safroleState.gamma_s,
      p_kappa,
      p_eta: p_entropy,
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

  const [, dd_rho] = RHO2DoubleDagger(
    { ea, p_kappa, hp: block.header.parent },
    d_rho,
  ).safeRet();

  const [egError, validatedEG] = assertEGValid(
    block.extrinsics.reportGuarantees,
    {
      headerLookupHistory: curState.headerLookupHistory,
      delta: curState.serviceAccounts,
      recentHistory: curState.recentHistory,
      accumulationHistory: curState.accumulationHistory,
      accumulationQueue: curState.accumulationQueue,
      rho: curState.rho,
      dd_rho,
      p_tau: tauTransition.p_tau,
      kappa: curState.kappa,
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
      p_tau: tauTransition.p_tau,
    },
    dd_rho,
  ).safeRet();
  if (rhoPostErr) {
    return err(rhoPostErr);
  }

  /*
   * Integrate state to calculate several posterior state
   * as defined in (176) and (177)
   */
  const w = availableReports(ea, d_rho);
  const w_mark = noPrereqAvailableReports(w);
  const w_q = withPrereqAvailableReports(w, curState.accumulationHistory);
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    curState.accumulationQueue,
    curState.tau,
  );

  // $(0.5.0 - 12.20)
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES,
    TOTAL_GAS_ACCUMULATION_PER_CORE * BigInt(CORES) +
      [...curState.privServices.g.values()].reduce((a, b) => a + b, 0n),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.5.0 - 12.21)
  const [nAccumulatedWork, o, bold_t, C] = outerAccumulation(
    g,
    w_star,
    {
      delta: curState.serviceAccounts,
      privServices: curState.privServices,
      authQueue: curState.authQueue,
      validatorKeys: curState.iota,
    },
    curState.privServices.g,
    curState.tau,
  );

  // $(0.5.0 - 12.22)
  const p_privilegedServices = toPosterior(o.privServices);
  const d_delta = o.delta as Dagger<Delta>;
  const p_iota = toPosterior(o.validatorKeys);
  const p_authorizerQueue = toPosterior(o.authQueue);

  const [, dd_delta] = deltaToDoubleDagger(
    { transfers: bold_t },
    d_delta,
  ).safeRet();

  const [pDeltaError, p_delta] = deltaToPosterior(
    {
      EP_Extrinsic: block.extrinsics.preimages,
      delta: curState.serviceAccounts,
      p_tau: tauTransition.p_tau,
    },
    dd_delta,
  ).safeRet();
  if (pDeltaError) {
    return err(pDeltaError);
  }

  const [, p_accumulationHistory] = accumulationHistoryToPosterior(
    {
      nAccumulatedWork,
      w_star,
      tau: curState.tau,
    },
    curState.accumulationHistory,
  ).safeRet();

  const [, p_accumulationQueue] = accumulationQueueToPosterior(
    {
      p_accHistory: p_accumulationHistory,
      p_tau: toPosterior(block.header.timeSlotIndex),
      tau: curState.tau,
      w_q,
    },
    curState.accumulationQueue,
  ).safeRet();

  const [, d_recentHistory] = recentHistoryToDagger(
    {
      hr: block.header.priorStateRoot,
    },
    curState.recentHistory,
  ).safeRet();

  const headerHash = Hashing.blake2b(
    encodeWithCodec(UnsignedHeaderCodec, block.header),
  );
  const [, p_recentHistory] = recentHistoryToPosterior(
    {
      accumulateRoot: calculateAccumulateRoot(C),
      headerHash,
      eg: block.extrinsics.reportGuarantees,
    },
    d_recentHistory,
  ).safeRet();

  const [, p_validatorStatistics] = validatorStatisticsToPosterior(
    {
      block: block,
      safrole: curState.safroleState,
      curTau: curState.tau,
    },
    curState.validatorStatistics,
  ).safeRet();

  const [, p_authorizerPool] = authorizerPool_toPosterior(
    {
      p_queue: p_authorizerQueue,
      eg: toTagged(block.extrinsics.reportGuarantees),
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
    authQueue: p_authorizerQueue,
    safroleState: p_safroleState,
    validatorStatistics: p_validatorStatistics,
    rho: p_rho,
    serviceAccounts: p_delta,
    recentHistory: p_recentHistory,
    accumulationQueue: p_accumulationQueue,
    accumulationHistory: p_accumulationHistory,
    privServices: p_privilegedServices,
    lambda: p_lambda,
    kappa: p_kappa,
    disputes: p_disputesState,
    headerLookupHistory: p_headerLookupHistory,
  });

  // $(0.5.0 - 5.2)
  if (
    block.header.parent !==
    curState.recentHistory[curState.recentHistory.length - 1].headerHash
  ) {
    return err(ImportBlockError.InvalidParentHeader);
  }

  // $(0.5.0 - 5.8)
  const prevMerkleRoot = merkelizeState(curState);
  if (prevMerkleRoot !== block.header.priorStateRoot) {
    return err(ImportBlockError.InvalidParentStateRoot);
  }

  // verify extrinsic merkle commitment
  // TODO: implement
  // $(0.5.0 - 5.4 / 5.5 / 5.6)

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

  if (!verifyExtrinsicHash(block.extrinsics, block.header.extrinsicHash)) {
    return err(ImportBlockError.InvalidHx);
  }

  if (!verifyOffenders(block.extrinsics, block.header.offenders)) {
    return err(ImportBlockError.InvalidOffenders);
  }

  return ok(p_state);
};
