import { BLOCK_TIME } from "@tsjam/constants";
import { merkelizeState } from "@tsjam/merklization";
import { err, ok } from "neverthrow";
import {
  HeaderHash,
  JamBlock,
  JamState,
  SignedJamHeader,
  STF,
} from "@tsjam/types";
import {
  DisputesToPosteriorError,
  ETError,
  GammaAError,
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_2_DaggerError,
  RHO_toPosterior,
  _I,
  authorizerPool_toPosterior,
  coreStatisticsSTF,
  deltaToDoubleDagger,
  deltaToPosterior,
  disputesSTF,
  etToIdentifiers,
  gamma_aSTF,
  gamma_sSTF,
  headerLookupHistorySTF,
  recentHistoryToDagger,
  beefyBeltToPosterior,
  rotateEntropy,
  rotateKeys,
  safroleToPosterior,
  serviceStatisticsSTF,
  validatorStatisticsToPosterior,
  recentHistoryToPosterior,
} from "@tsjam/transitions";
import { Timekeeping, toPosterior } from "@tsjam/utils";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { SignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
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
import { invokeOntransfers, transferStatistics } from "@tsjam/pvm";
import { EPError, validateEP } from "./validteEP";

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
 * $(0.6.4 - 4.1)
 */
export const importBlock: STF<
  { block: JamBlock; state: JamState },
  JamBlock,
  | ImportBlockError
  | GammaAError
  | EGError
  | ETError
  | RHO_2_DaggerError
  | DisputesToPosteriorError
  | EpochMarkerError
  | WinningTicketsError
  | EPError
> = (block, { block: parent, state: curState }) => {
  const tauTransition = {
    tau: curState.tau,
    // $(0.7.0 - 6.1)
    p_tau: toPosterior(block.header.timeSlotIndex),
  };
  const { p_tau } = tauTransition;

  // $(0.7.0 - 5.7)
  if (
    tauTransition.tau >= tauTransition.p_tau &&
    tauTransition.p_tau * BLOCK_TIME < Timekeeping.bigT()
    // && tauTransition.p_tau < 2 ** 32 // NOTE: this is implicit in previous line
  ) {
    return err(ImportBlockError.InvalidSlot);
  }

  // $(0.7.0 - 5.8)
  const prevMerkleRoot = merkelizeState(curState);

  if (prevMerkleRoot !== block.header.priorStateRoot) {
    return err(ImportBlockError.InvalidParentStateRoot);
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

  const [, [p_gamma_p, p_kappa, p_lambda, p_gamma_z]] = rotateKeys(
    {
      p_offenders: toPosterior(p_disputesState.offenders),
      iota: curState.iota,
      ...tauTransition,
    },
    [
      curState.safroleState.gamma_p,
      curState.kappa,
      curState.lambda,
      curState.safroleState.gamma_z,
    ],
  ).safeRet();

  const [etError, ticketIdentifiers] = etToIdentifiers(
    block.extrinsics.tickets,
    {
      p_tau,
      p_gamma_z,
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
      p_gamma_p,
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
  const validatedEa = verifyEA(ea, block.header.parent, curState.kappa, d_rho);
  if (!validatedEa) {
    return err(ImportBlockError.InvalidEA);
  }

  /*
   * Integrate state to calculate several posterior state
   */
  const w = availableReports(ea, d_rho);

  const [, d_recentHistory] = recentHistoryToDagger(
    {
      hr: block.header.priorStateRoot,
    },
    curState.beta.recentHistory,
  ).safeRet();

  const [
    ,
    {
      p_accumulationQueue,
      p_accumulationHistory,
      d_delta,
      p_iota,
      p_authQueue,
      deferredTransfers,
      p_mostRecentAccumulationOutputs,
      p_privServices,
      accumulationStatistics,
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

  const invokedOnTransfers = invokeOntransfers(d_delta, p_tau, {
    transfers: deferredTransfers,
  });

  const tStats = transferStatistics(deferredTransfers, invokedOnTransfers);

  const [, dd_delta] = deltaToDoubleDagger(
    { bold_x: invokedOnTransfers, accumulationStatistics, p_tau },
    d_delta,
  ).safeRet();

  const [, dd_rho] = RHO2DoubleDagger(
    { p_tau, rho: curState.rho, availableReports: w },
    d_rho,
  ).safeRet();

  const [egError, validatedEG] = assertEGValid(
    block.extrinsics.reportGuarantees,
    {
      headerLookupHistory: curState.headerLookupHistory,
      delta: curState.serviceAccounts,
      d_recentHistory,
      recentHistory: curState.beta.recentHistory,
      accumulationHistory: curState.accumulationHistory,
      accumulationQueue: curState.accumulationQueue,
      rho: curState.rho,
      authPool: curState.authPool,
      dd_rho,
      p_tau,
      p_kappa,
      p_lambda,
      p_entropy,
      p_offenders: toPosterior(p_disputesState.offenders),
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
  const [epError, validatedEP] = validateEP(block.extrinsics.preimages, {
    delta: curState.serviceAccounts,
  }).safeRet();

  if (epError) {
    return err(epError);
  }

  const [pDeltaError, p_delta] = deltaToPosterior(
    {
      ep: validatedEP,
      p_tau,
    },
    dd_delta,
  ).safeRet();
  if (pDeltaError) {
    return err(pDeltaError);
  }

  // TODO: beefyBeltToDagger
  const [, p_beefyBelt] = beefyBeltToPosterior(
    {
      p_theta: p_mostRecentAccumulationOutputs,
    },
    curState.beta.beefyBelt,
  ).safeRet();

  const headerHash = computeHeaderHash(block.header);
  const [, p_recentHistory] = recentHistoryToPosterior(
    {
      headerHash,
      beta_b_prime: p_beefyBelt,
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
        p_offenders: toPosterior(p_disputesState.offenders),
        p_lambda,
        p_entropy,
      }),
      authorIndex: block.header.blockAuthorKeyIndex,
      p_kappa,
      p_tau: toPosterior(block.header.timeSlotIndex),
      curTau: curState.tau,
    },
    curState.statistics.validators,
  ).safeRet();

  const guaranteedReports = _I(block.extrinsics.reportGuarantees);
  const [, p_coreStatistics] = coreStatisticsSTF(
    {
      availableReports: w,
      assurances: block.extrinsics.assurances,
      guaranteedReports,
    },
    curState.statistics.cores,
  ).safeRet();

  const [, p_serviceStatistics] = serviceStatisticsSTF(
    {
      guaranteedReports,
      preimages: block.extrinsics.preimages,
      transferStatistics: tStats,
      accumulationStatistics,
    },
    curState.statistics.services,
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

  // TODO: ---
  const p_state = toPosterior({
    entropy: p_entropy,
    tau: tauTransition.p_tau,
    iota: p_iota as unknown as JamState["iota"],
    authPool: p_authorizerPool,
    authQueue: p_authQueue,
    safroleState: p_safroleState,
    statistics: {
      validators: p_validatorStatistics,
      cores: p_coreStatistics,
      services: p_serviceStatistics,
    },
    rho: p_rho,
    serviceAccounts: p_delta,
    beta: toPosterior({
      recentHistory: p_recentHistory,
      beefyBelt: p_beefyBelt,
    }),
    accumulationQueue: p_accumulationQueue,
    accumulationHistory: p_accumulationHistory,
    privServices: p_privServices,
    lambda: p_lambda,
    kappa: p_kappa,
    disputes: p_disputesState,
    headerLookupHistory: p_headerLookupHistory,
    mostRecentAccumulationOutputs: p_mostRecentAccumulationOutputs,
  });

  // $(0.6.4 - 5.2)
  if (block.header.parent !== computeHeaderHash(parent.header)) {
    return err(ImportBlockError.InvalidParentHeader);
  }

  if (!verifySeal(block.header, p_state)) {
    return err(ImportBlockError.InvalidSeal);
  }

  if (!verifyEntropySignature(block.header, p_state)) {
    return err(ImportBlockError.InvalidEntropySignature);
  }

  const x = verifyEpochMarker(block, curState, p_gamma_p);
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

  return ok(toPosterior({ block, state: p_state }));
};
