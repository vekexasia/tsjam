import {
  AuthorizerPool,
  AuthorizerQueue,
  Delta,
  IDisputesState,
  JamBlock,
  MerkeTreeRoot,
  PrivilegedServices,
  RHO,
  RecentHistory,
  SafroleState,
  ValidatorStatistics,
  u64,
} from "@tsjam/types";
import {
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_toPosterior,
  authorizerPool_toPosterior,
  authorizerQueue_toPosterior,
  deltaToDagger,
  deltaToDoubleDagger,
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
import { accumulateInvocation } from "@tsjam/pvm";

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

export const importBlock = (block: JamBlock) => {
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

  const dd_delta = deltaToDoubleDagger.apply(
    {
      accummulationResult: new Map(), //todo
    },
    d_delta,
  );

  const p_delta = deltaToPosterior.apply(
    {
      accummulationResult: new Map(), //todo
    },
    dd_delta,
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

  const xares = accumulateInvocation(
    d_delta,
    privilegedServices.a,
    0n as u64, // todo gas according to (162)
    [],
    {
      tau: safroleState.tau,
      iota: safroleState.iota,
      authQueue: authorizerQueue,
      privilegedServices: privilegedServices,
    },
  );
  const p_authorizerQueue = authorizerQueue_toPosterior.apply(
    xares,
    authorizerQueue,
  );

  const p_authorizerPool = authorizerPool_toPosterior.apply(
    {
      p_queue: p_authorizerQueue,
      eg: toTagged(block.extrinsics.reportGuarantees),
      p_tau: toPosterior(newSafroleState.tau),
    },
    authorizerPool,
  );

  // (164) privilegedServices update
  const privservRes = accumulateInvocation(
    d_delta,
    privilegedServices.m,
    0n as u64, // todo gas according to (162)
    [],
    {
      tau: safroleState.tau,
      iota: safroleState.iota,
      authQueue: authorizerQueue,
      privilegedServices,
    },
  );

  // (164) iota update
  const iotaRes = accumulateInvocation(
    d_delta,
    privilegedServices.v,
    0n as u64, // todo gas according to (162)
    [],
    {
      tau: safroleState.tau,
      iota: newSafroleState.iota, // iota here is only used to polyfill the result it's not actually used in computation
      authQueue: authorizerQueue,
      privilegedServices,
    },
  );

  newSafroleState.iota =
    iotaRes.validatorKeys as unknown as SafroleState["iota"];

  //todo assign
  safroleState = newSafroleState;
  disputesState = p_disputesState;
  rho = p_rho;
  delta = p_delta;
  recentHistory = p_recentHistory;
  validatorStatistics = p_validatorStatistics;
  authorizerQueue = p_authorizerQueue;
  authorizerPool = p_authorizerPool;
  privilegedServices = privservRes.p;
};
