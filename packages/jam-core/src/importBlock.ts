import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerPool,
  AuthorizerQueue,
  AvailableWithPrereqWorkReports,
  Delta,
  DoubleDagger,
  Hash,
  IDisputesState,
  JamBlock,
  MerkeTreeRoot,
  PrivilegedServices,
  RHO,
  RecentHistory,
  SafroleState,
  ServiceIndex,
  Tagged,
  Tau,
  ValidatorStatistics,
  WorkReport,
  u64,
} from "@tsjam/types";
import {
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_toPosterior,
  accumulationHistoryToPosterior,
  accumulationQueueToPosterior,
  authorizerPool_toPosterior,
  deltaToDagger,
  deltaToPosterior,
  disputesSTF,
  recentHistoryToDagger,
  recentHistoryToPosterior,
  safroleToPosterior,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import { toPosterior, toTagged } from "@tsjam/utils";
import { Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { assertEGValid } from "@/validateEG.js";
import { outerAccumulation } from "@tsjam/pvm";

let safroleState: SafroleState = null as unknown as SafroleState;
let recentHistory: RecentHistory = null as unknown as RecentHistory;
let rho: RHO = null as unknown as RHO;
let disputesState: IDisputesState = null as unknown as IDisputesState;
let delta: Delta = null as unknown as Delta;
let validatorStatistics: ValidatorStatistics =
  null as unknown as ValidatorStatistics;
let authorizerQueue: AuthorizerQueue = null as unknown as AuthorizerQueue;
let authorizerPool: AuthorizerPool = null as unknown as AuthorizerPool;
let privilegedServices: PrivilegedServices =
  null as unknown as PrivilegedServices;
const accumulationHistory: AccumulationHistory =
  null as unknown as AccumulationHistory;
let accumulationQueue: AccumulationQueue = null as unknown as AccumulationQueue;
export let beefyCommitment: Set<{ service: ServiceIndex; hash: Hash }> =
  new Set();

export const importBlock = (block: JamBlock, tau: Tau) => {
  const headerHash = Hashing.blake2b(
    encodeWithCodec(UnsignedHeaderCodec, block.header),
  );
  const newSafroleState = safroleToPosterior.apply(
    {
      h_v: block.header.entropySignature,
      p_tau: toPosterior(block.header.timeSlotIndex),
      et: block.extrinsics.tickets,
    },
    safroleState,
  );

  const p_disputesState = disputesSTF.apply(
    {
      kappa: safroleState.kappa,
      lambda: safroleState.lambda,
      extrinsic: block.extrinsics.disputes,
      curTau: safroleState.tau,
    },
    disputesState,
  );
  // checks guarantees are valid
  assertEGValid(block.extrinsics.reportGuarantees, {
    p_eta: toPosterior(newSafroleState.eta),
    kappa: safroleState.kappa,
    p_kappa: toPosterior(newSafroleState.kappa),
    p_lambda: toPosterior(newSafroleState.lambda),
    p_tau: toPosterior(newSafroleState.tau),
    p_psi_o: toPosterior(p_disputesState.psi_o),
  });

  const d_rho = RHO_2_Dagger.apply(p_disputesState, rho);

  const dd_rho = RHO2DoubleDagger.apply(
    {
      ea: block.extrinsics.assurances,
      p_kappa: toPosterior(newSafroleState.kappa),
      hp: block.header.previousHash,
    },
    d_rho,
  );

  const p_rho = RHO_toPosterior.apply(
    {
      EG_Extrinsic: block.extrinsics.reportGuarantees,
      kappa: safroleState.kappa,
      p_tau: toPosterior(newSafroleState.tau),
    },
    dd_rho,
  );

  const d_delta = deltaToDagger.apply(
    {
      EG_Extrinsic: block.extrinsics.reportGuarantees,
      EP_Extrinsic: block.extrinsics.preimages,
      p_tau: toPosterior(newSafroleState.tau),
    },
    delta,
  );

  /**
   * Integrate state to calculate several posterior state
   * as defined in (176) and (177)
   */
  //TODO: w star and w_q
  const w_q: AvailableWithPrereqWorkReports =
    [] as unknown as AvailableWithPrereqWorkReports;
  const w_star = [] as unknown as Tagged<WorkReport[], "W*">;

  const [nAccumulatedWork, o, bold_t, C] = outerAccumulation(
    3n as u64,
    w_star,
    {
      delta: d_delta,
      privServices: privilegedServices,
      authQueue: authorizerQueue,
      validatorKeys: safroleState.iota,
    },
    privilegedServices.g,
    tau,
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
      tau,
    },
    accumulationHistory,
  );

  const p_accumulationQueue = accumulationQueueToPosterior.apply(
    {
      p_accHistory: p_accumulationHistory,
      p_tau: toPosterior(block.header.timeSlotIndex),
      tau,

      w_q,
    },
    accumulationQueue,
  );

  const d_recentHistory = recentHistoryToDagger.apply(
    {
      hr: block.header.priorStateRoot,
    },
    recentHistory,
  );

  const p_recentHistory = recentHistoryToPosterior.apply(
    {
      accumulateRoot: null as unknown as MerkeTreeRoot, // todo
      headerHash: headerHash,
      workPackageHashes: [], // todo
    },
    d_recentHistory,
  );

  const p_validatorStatistics = validatorStatisticsToPosterior.apply(
    {
      block: block,
      safrole: safroleState,
      curTau: safroleState.tau,
    },
    validatorStatistics,
  );

  const p_authorizerPool = authorizerPool_toPosterior.apply(
    {
      p_queue: p_authorizerQueue,
      eg: toTagged(block.extrinsics.reportGuarantees),
      p_tau: toPosterior(newSafroleState.tau),
    },
    authorizerPool,
  );

  newSafroleState.iota = p_iota as unknown as SafroleState["iota"];

  accumulationQueue = p_accumulationQueue;
  //todo assign
  safroleState = newSafroleState;
  disputesState = p_disputesState;
  rho = p_rho;
  delta = p_delta;
  recentHistory = p_recentHistory;
  validatorStatistics = p_validatorStatistics;
  authorizerQueue = p_authorizerQueue;
  authorizerPool = p_authorizerPool;
  privilegedServices = p_privilegedServices;
  beefyCommitment = C;
};
