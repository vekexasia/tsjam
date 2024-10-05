import {
  Delta,
  IDisputesState,
  JamBlock,
  MerkeTreeRoot,
  RHO,
  RecentHistory,
  SafroleState,
  ValidatorStatistics,
} from "@tsjam/types";
import {
  RHO2DoubleDagger,
  RHO_2_Dagger,
  RHO_toPosterior,
  deltaToDagger,
  deltaToDoubleDagger,
  deltaToPosterior,
  disputesSTF,
  recentHistoryToDagger,
  recentHistoryToPosterior,
  safroleToPosterior,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import { toPosterior } from "@tsjam/utils";
import { Hashing } from "@tsjam/crypto";
import { UnsignedHeaderCodec, encodeWithCodec } from "@tsjam/codec";
import { assertEGValid } from "@/validateEG.js";

const safroleState: SafroleState = null as unknown as SafroleState;
const recentHistory: RecentHistory = null as unknown as RecentHistory;
const rho: RHO = null as unknown as RHO;
const disputesState: IDisputesState = null as unknown as IDisputesState;
const delta: Delta = null as unknown as Delta;
const validatorStatistics: ValidatorStatistics =
  null as unknown as ValidatorStatistics;

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

  //todo assign
};
