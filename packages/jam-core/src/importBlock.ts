import {
  Delta,
  DoubleDagger,
  JamBlock,
  JamState,
  TicketIdentifier,
  u64,
} from "@tsjam/types";
import {
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_toPosterior,
  accumulationHistoryToPosterior,
  accumulationQueueToPosterior,
  authorizerPool_toPosterior,
  calculateAccumulateRoot,
  deltaToDagger,
  deltaToPosterior,
  disputesSTF,
  entropyRotationSTF,
  eta0STF,
  gamma_aSTF,
  gamma_sSTF,
  recentHistoryToDagger,
  recentHistoryToPosterior,
  rotateKeys,
  safroleToPosterior,
  ticketExtrinsicToIdentifiersSTF,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import {
  bigintToBytes,
  isFallbackMode,
  toPosterior,
  toTagged,
} from "@tsjam/utils";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { assertEGValid } from "@/validateEG.js";
import {
  accHistoryUnion,
  accumulatableReports,
  availableReports,
  noPrereqAvailableReports,
  outerAccumulation,
  withPrereqAvailableReports,
} from "@tsjam/pvm";
import {
  EPOCH_LENGTH,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
} from "@tsjam/constants";
import assert from "assert";
import { verifyEntropySignature, verifySeal } from "./verifySeal";

/**
 * TODO: this should be an STF
 */
export const importBlock = (block: JamBlock, curState: JamState): JamState => {
  const headerHash = Hashing.blake2b(
    encodeWithCodec(UnsignedHeaderCodec, block.header),
  );
  const tauTransition = {
    tau: curState.tau,
    p_tau: toPosterior(block.header.timeSlotIndex),
  };

  if (tauTransition.tau >= tauTransition.p_tau) {
    throw new Error("Invalid slot");
  }

  // TODO: make these 2 a single STF with proper inputs
  const p_entropy = entropyRotationSTF.apply(tauTransition, curState.entropy);
  p_entropy[0] = eta0STF.apply(
    Bandersnatch.vrfOutputSignature(block.header.blockSeal),
    curState.entropy[0],
  );

  const p_disputesState = disputesSTF.apply(
    {
      kappa: curState.kappa,
      lambda: curState.lambda,
      extrinsic: block.extrinsics.disputes,
      curTau: curState.tau,
    },
    curState.disputes,
  );
  const [p_lambda, p_kappa, p_gamma_k, p_gamma_z] = rotateKeys.apply(
    {
      p_psi_o: toPosterior(p_disputesState.psi_o),
      iota: curState.iota,
      ...tauTransition,
    },
    [
      curState.lambda,
      curState.kappa,
      curState.safroleState.gamma_k,
      curState.safroleState.gamma_z,
    ],
  );

  const ticketIdentifiers = ticketExtrinsicToIdentifiersSTF.apply(
    {
      extrinsic: block.extrinsics.tickets,
      p_tau: tauTransition.p_tau,
      gamma_z: curState.safroleState.gamma_z,
      gamma_a: curState.safroleState.gamma_a,
      p_entropy,
    },
    null,
  );

  const p_gamma_s = gamma_sSTF.apply(
    {
      ...tauTransition,
      gamma_a: curState.safroleState.gamma_a,
      gamma_s: curState.safroleState.gamma_s,
      p_kappa,
      p_eta: p_entropy,
    },
    curState.safroleState.gamma_s,
  );

  const p_gamma_a = gamma_aSTF.apply(
    {
      ...tauTransition,
      newIdentifiers: ticketIdentifiers,
    },
    curState.safroleState.gamma_a,
  );

  const p_safroleState = safroleToPosterior.apply(
    {
      p_gamma_a,
      p_gamma_k,
      p_gamma_s,
      p_gamma_z,
    },
    curState.safroleState,
  );

  // checks guarantees are valid
  assertEGValid(block.extrinsics.reportGuarantees, {
    //TODO:rename to p_entropy
    p_eta: p_entropy,
    kappa: curState.kappa,
    p_kappa,
    p_lambda,
    p_tau: tauTransition.p_tau,
    p_psi_o: toPosterior(p_disputesState.psi_o),
  });

  const d_rho = RHO_2_Dagger.apply(p_disputesState, curState.rho);

  const dd_rho = RHO2DoubleDagger.apply(
    {
      ea: block.extrinsics.assurances,
      p_kappa,
      hp: block.header.parent,
    },
    d_rho,
  );

  const p_rho = RHO_toPosterior.apply(
    {
      EG_Extrinsic: block.extrinsics.reportGuarantees,
      kappa: curState.kappa,
      p_tau: tauTransition.p_tau,
    },
    dd_rho,
  );

  const d_delta = deltaToDagger.apply(
    {
      EG_Extrinsic: block.extrinsics.reportGuarantees,
      EP_Extrinsic: block.extrinsics.preimages,
      p_tau: tauTransition.p_tau,
    },
    curState.serviceAccounts,
  );

  /**
   * Integrate state to calculate several posterior state
   * as defined in (176) and (177)
   */
  const w = availableReports(block.extrinsics.assurances, d_rho);
  const w_mark = noPrereqAvailableReports(w);
  const w_q = withPrereqAvailableReports(
    w,
    accHistoryUnion(curState.accumulationHistory),
  );
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    curState.accumulationQueue,
    curState.accumulationHistory,
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

  const p_delta = deltaToPosterior.apply(
    {
      bold_t,
    },
    dd_delta,
  );

  const p_accumulationHistory = accumulationHistoryToPosterior.apply(
    {
      nAccumulatedWork,
      w_star,
      tau: curState.tau,
    },
    curState.accumulationHistory,
  );

  const p_accumulationQueue = accumulationQueueToPosterior.apply(
    {
      p_accHistory: p_accumulationHistory,
      p_tau: toPosterior(block.header.timeSlotIndex),
      tau: curState.tau,
      w_q,
    },
    curState.accumulationQueue,
  );

  const d_recentHistory = recentHistoryToDagger.apply(
    {
      hr: block.header.priorStateRoot,
    },
    curState.recentHistory,
  );

  const p_recentHistory = recentHistoryToPosterior.apply(
    {
      accumulateRoot: calculateAccumulateRoot(C),
      headerHash: headerHash,
      workPackageHashes: [], // todo:
    },
    d_recentHistory,
  );

  const p_validatorStatistics = validatorStatisticsToPosterior.apply(
    {
      block: block,
      safrole: curState.safroleState,
      curTau: curState.tau,
    },
    curState.validatorStatistics,
  );

  const p_authorizerPool = authorizerPool_toPosterior.apply(
    {
      p_queue: p_authorizerQueue,
      eg: toTagged(block.extrinsics.reportGuarantees),
      p_tau: tauTransition.p_tau,
    },
    curState.authPool,
  );

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

  assert(verifySeal(block.header, p_state), "seal not verified");

  assert(
    verifyEntropySignature(block.header, p_state),
    "entropy signature not verified",
  );
  return p_state;
};
