import { BLOCK_TIME, LOTTERY_MAX_SLOT } from "@tsjam/constants";
import { merkelizeState } from "@tsjam/merklization";
import { err, ok } from "neverthrow";
import {
  Delta,
  DoubleDagger,
  JamBlock,
  JamState,
  STF,
  SeqOfLength,
  TicketIdentifier,
  u64,
} from "@tsjam/types";
import {
  DeltaToDaggerError,
  DisputesToPosteriorError,
  ETError,
  GammaAError,
  RHO2DoubleDagger,
  RHO2DoubleDaggerError,
  RHO_2_Dagger,
  RHO_2_DaggerError,
  RHO_toPosterior,
  RhoToPosteriorError,
  accumulationHistoryToPosterior,
  accumulationQueueToPosterior,
  authorizerPool_toPosterior,
  calculateAccumulateRoot,
  deltaToDagger,
  deltaToPosterior,
  disputesSTF,
  etToIdentifiers,
  gamma_aSTF,
  gamma_sSTF,
  outsideInSequencer,
  recentHistoryToDagger,
  recentHistoryToPosterior,
  rotateEntropy,
  rotateKeys,
  safroleToPosterior,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import {
  Timekeeping,
  epochIndex,
  slotIndex,
  toPosterior,
  toTagged,
} from "@tsjam/utils";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { EGError, assertEGValid } from "@/validateEG.js";
import {
  accumulatableReports,
  availableReports,
  noPrereqAvailableReports,
  outerAccumulation,
  withPrereqAvailableReports,
} from "@tsjam/pvm";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  EpochMarkerError,
  verifyEntropySignature,
  verifyEpochMarker,
  verifySeal,
} from "@/verifySeal";

export enum ImportBlockError {
  InvalidSlot = "Invalid slot",
  InvalidSeal = "Invalid seal",
  InvalidEntropySignature = "Invalid entropy signature",
  InvalidEntropy = "Invalid entropy",
  InvalidEpochMarker = "Epoch marker set but not in new epoch",
  InvalidEpochMarkerValidator = "Epoch marker validator key mismatch",
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
  | RhoToPosteriorError
  | DeltaToDaggerError
  | GammaAError
  | EGError
  | ETError
  | RHO_2_DaggerError
  | RHO2DoubleDaggerError
  | DisputesToPosteriorError
  | EpochMarkerError
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
      vrfOut: Bandersnatch.vrfOutputSignature(block.header.entropySignature),
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

  const [egError, validatedEG] = assertEGValid(
    block.extrinsics.reportGuarantees,
    {
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

  const [rhoDaggErr, d_rho] = RHO_2_Dagger(
    p_disputesState,
    curState.rho,
  ).safeRet();
  if (rhoDaggErr) {
    return err(rhoDaggErr);
  }

  const [rhoDDaggErr, dd_rho] = RHO2DoubleDagger(
    { ea: block.extrinsics.assurances, p_kappa, hp: block.header.parent },
    d_rho,
  ).safeRet();
  if (rhoDDaggErr) {
    return err(rhoDDaggErr);
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

  const [deltaDaggErr, d_delta] = deltaToDagger(
    {
      EG_Extrinsic: validatedEG,
      EP_Extrinsic: block.extrinsics.preimages,
      p_tau: tauTransition.p_tau,
    },
    curState.serviceAccounts,
  ).safeRet();
  if (deltaDaggErr) {
    return err(deltaDaggErr);
  }
  /*
   * Integrate state to calculate several posterior state
   * as defined in (176) and (177)
   */
  const w = availableReports(block.extrinsics.assurances, d_rho);
  const w_mark = noPrereqAvailableReports(w);
  const w_q = withPrereqAvailableReports(w, curState.accumulationHistory);
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    curState.accumulationQueue,
    curState.tau,
  );

  const [nAccumulatedWork, o, bold_t, C] = outerAccumulation(
    3n as u64,
    w_star,
    {
      delta: d_delta,
      privServices: curState.privServices,
      authQueue: curState.authQueue,
      validatorKeys: curState.iota,
    },
    curState.privServices.g,
    curState.tau,
  );

  const p_privilegedServices = toPosterior(o.privServices);
  const p_authorizerQueue = toPosterior(o.authQueue);
  const dd_delta = o.delta as DoubleDagger<Delta>;
  const p_iota = toPosterior(o.validatorKeys);
  const [, p_delta] = deltaToPosterior(
    {
      bold_t,
    },
    dd_delta,
  ).safeRet();

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

  const [, p_recentHistory] = recentHistoryToPosterior(
    {
      accumulateRoot: calculateAccumulateRoot(C),
      headerHash: Hashing.blake2b(
        encodeWithCodec(UnsignedHeaderCodec, block.header),
      ),
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

  const x = verifyEpochMarker(block, curState, p_entropy, p_gamma_k);
  if (x.isErr()) {
    return err(x.error);
  }

  //check winning tickets Hw (73) - 0.4.5
  if (
    epochIndex(block.header.timeSlotIndex) === curState.tau &&
    slotIndex(curState.tau) <= LOTTERY_MAX_SLOT &&
    LOTTERY_MAX_SLOT <= slotIndex(block.header.timeSlotIndex) &&
    curState.safroleState.gamma_a.length === EPOCH_LENGTH
  ) {
    if (block.header.winningTickets?.length !== EPOCH_LENGTH) {
      return err(ImportBlockError.WinningTicketsNotEnoughLong);
    }
    const expectedHw = outsideInSequencer(
      curState.safroleState.gamma_a as unknown as SeqOfLength<
        TicketIdentifier,
        typeof EPOCH_LENGTH
      >,
    );
    // (73) - 0.4.5
    for (let i = 0; i < EPOCH_LENGTH; i++) {
      if (block.header.winningTickets[i] !== expectedHw[i]) {
        return err(ImportBlockError.WinningTicketMismatch);
      }
    }
  } else {
    if (typeof block.header.winningTickets !== "undefined") {
      return err(ImportBlockError.WinningTicketsNotExpected);
    }
  }
  return ok(p_state);
};
