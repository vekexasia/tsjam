import {
  CORES,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerQueue,
  Dagger,
  DeferredTransfer,
  Delta,
  EA_Extrinsic,
  Gas,
  GasUsed,
  JamEntropy,
  PVMAccumulationState,
  PVMResultContext,
  Posterior,
  PrivilegedServices,
  RHO,
  ServiceIndex,
  Tagged,
  Tau,
  Validated,
  WorkPackageHash,
  WorkReport,
  u32,
  u64,
} from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";
import { AccumulationHistoryImpl } from "./classes/AccumulationHistoryImpl";
import { AccumulationOutImpl } from "./classes/AccumulationOutImpl";
import {
  AccumulationQueueImpl,
  AccumulationQueueItem,
} from "./classes/AccumulationQueueImpl";
import { AuthorizerQueueImpl } from "./classes/AuthorizerQueueImpl";
import { DeferredTransferImpl } from "./classes/DeferredTransferImpl";
import { DeltaImpl } from "./classes/DeltaImpl";
import { PrivilegedServicesImpl } from "./classes/PrivilegedServicesImpl";
import { PVMAccumulationOpImpl } from "./classes/PVMAccumulationOPImpl";
import { PVMAccumulationStateImpl } from "./classes/PVMAccumulationStateImpl";
import { ServiceOutsImpl } from "./classes/ServiceOutsImpl";
import { ValidatorsImpl } from "./classes/ValidatorsImpl";
import {
  AccumulatableWorkReports,
  AvailableNoPrereqWorkReports,
  AvailableWorkReports,
  WorkReportImpl,
} from "./classes/WorkReportImpl";
import { accumulateInvocation } from "./pvm";
import { AccumulationStatisticsImpl } from "./classes/AccumulationStatisticsImpl";
import { AssurancesExtrinsicImpl } from "./classes/extrinsics/assurances";
import { RHOImpl } from "./classes/RHOImpl";

/**
 * Decides which reports to accumulate and accumulates them
 * computes a series of posterior states
 */
export const accumulateReports = (
  r: AvailableWorkReports,
  deps: {
    accumulationHistory: AccumulationHistoryImpl;
    accumulationQueue: AccumulationQueueImpl;
    authQueue: AuthorizerQueueImpl;
    serviceAccounts: DeltaImpl;
    tau: Tau;
    p_tau: Posterior<Tau>;
    privServices: PrivilegedServicesImpl;
    iota: Tagged<ValidatorsImpl, "iota">;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
) => {
  /*
   * Integrate state to calculate several posterior state
   */
  const r_mark = noPrereqAvailableReports(r);

  const r_q = withPrereqAvailableReports(r, deps.accumulationHistory);
  // console.log({ w_q: w_q });
  const r_star = accumulatableReports(
    r_mark,
    r_q,
    deps.accumulationQueue,
    deps.p_tau,
  );

  // $(0.7.0 - 12.22)
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES, //GT
    TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) + // GA*C
      [...deps.privServices.alwaysAccers.values()].reduce((a, b) => a + b, 0n),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.7.0 - 12.23)
  // `e`
  const preState = new PVMAccumulationStateImpl({
    accounts: deps.serviceAccounts,
    stagingSet: deps.iota,
    authQueue: deps.authQueue,
    manager: deps.privServices.manager,
    assigners: deps.privServices.assigners,
    delegator: deps.privServices.delegator,
    alwaysAccers: deps.privServices.alwaysAccers,
  });

  // $(0.7.0 - 12.24)
  const [
    nAccumulatedWork, // `n`
    postState, // `e'`
    bold_t,
    p_mostRecentAccumulationOutputs, // θ′
    gasUsed, // `bold u`
  ] = outerAccumulation(g, r_star, preState, deps.privServices.alwaysAccers, {
    p_tau: deps.p_tau,
    p_eta_0: deps.p_eta_0,
  });

  const accumulationStatistics = AccumulationStatisticsImpl.compute({
    r_star,
    nAccumulatedWork,
    gasUsed,
  });

  // calculate posterior acc history
  const p_accumulationHistory = deps.accumulationHistory.toPosterior({
    r_star,
    nAccumulatedWork,
  });

  // $(0.7.0 - 12.37) - calculate p_accumulationQueue
  const p_accumulationQueue = deps.accumulationQueue.toPosterior({
    tau: deps.tau,
    p_tau: deps.p_tau,
    r_q,
    p_accumulationHistory: p_accumulationHistory,
  });
  // end of calculation of posterior accumulation queue

  return ok({
    deferredTransfers: bold_t,
    p_accumulationHistory,
    p_accumulationQueue,
    p_mostRecentAccumulationOutputs,
    p_privServices: toPosterior(<PrivilegedServices>{
      manager: postState.manager,
      delegator: postState.delegator,
      assigners: postState.assigners,
      alwaysAccers: postState.alwaysAccers,
    }),
    d_delta: toDagger(postState.accounts),
    p_iota: toPosterior(postState.stagingSet),
    p_authQueue: toPosterior(postState.authQueue),
    accumulationStatistics,
  });
};

/**
 * `bold R`
 * $(0.7.0 - 11.16)
 * @param ea - Availability Extrinsic
 * @param d_rho - dagger rho
 */
export const availableReports = (
  ea: Validated<AssurancesExtrinsicImpl>,
  d_rho: Dagger<RHOImpl>,
): AvailableWorkReports => {
  const W: WorkReportImpl[] = [];
  for (let c = 0; c < CORES; c++) {
    const sum = ea.nPositiveVotes(c);

    if (sum > (NUMBER_OF_VALIDATORS * 2) / 3) {
      W.push(d_rho.elements[c]!.workReport);
    }
  }
  return toTagged(W);
};

/**
 * Computes  `R!` in the paper
 * $(0.7.0 - 12.4)
 */
export const noPrereqAvailableReports = (
  bold_R: AvailableWorkReports,
): AvailableNoPrereqWorkReports => {
  return toTagged(
    bold_R.filter(
      (wr) => wr.context.prerequisites.length === 0 && wr.srLookup.size === 0,
    ),
  );
};

/**
 * Computes the union of the AccumulationHistory
 * $(0.7.0 - 12.2)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistoryImpl,
): Set<WorkPackageHash> => {
  return toTagged(
    new Set(accHistory.elements.map((a) => [...a.values()]).flat()),
  );
};

/**
 * $(0.7.0 - 12.7)
 */
export const E_Fn = (
  r: AccumulationQueueItem[],
  x: Set<WorkPackageHash>,
): AccumulationQueueItem[] => {
  const toRet: AccumulationQueueItem[] = [];

  for (const { workReport /* w */, dependencies /* d */ } of r) {
    if (x.has(workReport.avSpec.packageHash)) {
      continue;
    }

    const newDeps = new Set(dependencies);
    x.forEach((packageHash) => newDeps.delete(packageHash));
    toRet.push(
      new AccumulationQueueItem({ workReport, dependencies: newDeps }),
    );
  }
  return toRet;
};

/**
 * `WQ` in the paper
 * $(0.7.0 - 12.5)
 */
export const withPrereqAvailableReports = (
  bold_R: AvailableWorkReports,
  accHistory: AccumulationHistoryImpl,
): Tagged<Array<AccumulationQueueItem>, "available-yes-prerequisites"> => {
  return toTagged(
    E_Fn(
      bold_R
        .filter((wr) => {
          return wr.context.prerequisites.length > 0 || wr.srLookup.size > 0;
        })
        .map((wr) => {
          // $(0.7.0 - 12.6) | D fn calculated inline
          const deps = new Set<WorkPackageHash>(wr.srLookup.keys());
          wr.context.prerequisites.forEach((rwp) => deps.add(rwp));
          return new AccumulationQueueItem({
            workReport: wr,
            dependencies: deps,
          });
        }),
      accHistoryUnion(accHistory),
    ),
  );
};

/**
 * `Q` fn
 * $(0.7.0 - 12.8)
 */
export const computeAccumulationPriority = (
  r: AccumulationQueueItem[],
): WorkReport[] => {
  const g = r
    .filter(({ dependencies }) => dependencies.size === 0)
    .map(({ workReport }) => workReport);
  if (g.length === 0) {
    return [];
  }

  return [
    ...g,
    ...computeAccumulationPriority(
      E_Fn(r, WorkReportImpl.extractWorkPackageHashes(g)),
    ),
  ];
};

/**
 * `bold R*` in the paper
 * $(0.7.0 - 12.11)
 */
export const accumulatableReports = (
  r_mark: ReturnType<typeof noPrereqAvailableReports>,
  r_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueueImpl,
  p_tau: Posterior<Tau>, // Ht
): AccumulatableWorkReports => {
  // $(0.7.0 - 12.10)
  const m = p_tau % EPOCH_LENGTH;

  const accprio = computeAccumulationPriority(
    // $(0.7.0 - 12.12)
    E_Fn(
      [
        ...accumulationQueue.elements.slice(m).flat(),
        ...accumulationQueue.elements.slice(0, m).flat(),
        ...r_q,
      ],
      WorkReportImpl.extractWorkPackageHashes(r_mark),
    ),
  );
  return [...r_mark, ...accprio] as AccumulatableWorkReports;
};

/**
 * `∆+`
 * @param gasLimit - `g`
 * @param works - `bold_w`
 * @param accState - `bold_e` initial partial accumulation state
 * @param freeAccServices - `bold_f`
 * @see $(0.7.0 - 12.16)
 */
export const outerAccumulation = (
  gasLimit: Gas,
  works: WorkReport[],
  accState: PVMAccumulationStateImpl,
  freeAccServices: Map<ServiceIndex, u64>,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): [
  nAccumulatedWork: number,
  accState: PVMAccumulationStateImpl,
  transfers: DeferredTransferImpl[],
  ServiceOutsImpl,
  GasUsed,
] => {
  let sum = 0n;
  let i = 0;
  // TODO: rewrite this to a more elegant solution
  for (const w of works) {
    sum += w.digests.reduce((a, r) => a + r.gasLimit, 0n);
    if (sum <= gasLimit) {
      i++;
    } else {
      break;
    }
  }

  if (i == 0) {
    return [0, accState, [], new ServiceOutsImpl(new Set()), []];
  }

  const [newAccState /* e_star */, t_star, b_star, u_star] =
    parallelizedAccumulation(
      accState,
      works.slice(0, i),
      freeAccServices,
      deps,
    );
  const consumedGas = u_star
    .map((a) => a.gasUsed)
    .reduce((s, e) => <Gas>(s + e), <Gas>0n);

  const [j, finalAccState /* e' */, t, b, u] = outerAccumulation(
    (gasLimit - consumedGas) as Gas,
    works.slice(i),
    newAccState,
    new Map(),
    deps,
  );

  return [
    i + j,
    finalAccState,
    t_star.concat(t),
    new Set([...b_star.values(), ...b.values()]),
    u_star.concat(u),
  ];
};

/**
 * `∆*` fn
 * @param accState - `bold_e` initial partial accumulation state
 * @param works - `bold_w`
 * $(0.7.0 - 12.17)
 */
export const parallelizedAccumulation = (
  accState: PVMAccumulationStateImpl,
  works: WorkReport[],
  f: Map<ServiceIndex, u64>,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): [
  accState: PVMAccumulationStateImpl,
  transfers: DeferredTransferImpl[],
  b: ServiceOutsImpl,
  u: GasUsed,
] => {
  const bold_s = [
    ...new Set([
      ...works.map((wr) => wr.digests.map((r) => r.serviceIndex)).flat(),
      ...f.keys(),
    ]).values(),
  ];

  const u: GasUsed = [];
  const accumulatedServices: Array<
    ReturnType<typeof singleServiceAccumulation>
  > = [];
  const t: DeferredTransfer[] = [];
  const b = new ServiceOutsImpl(new Set());

  bold_s.forEach((s) => {
    const acc = singleServiceAccumulation(accState, works, f, s, deps);

    u.push({ serviceIndex: s, gasUsed: acc.gasUsed });
    accumulatedServices.push(acc);

    if (typeof acc.yield !== "undefined") {
      b.add(s, acc.yield);
    }
    // we concat directly here
    t.push(...acc.deferredTransers);
  });

  const delta: Delta = structuredClone(accState.accounts);

  // should contain "removed" services
  const m: Set<ServiceIndex> = new Set();
  // should contain "added/updated" services
  const n: Delta = new Map();
  for (let i = 0; i < bold_s.length; i++) {
    const s = bold_s[i];
    const acc = accumulatedServices[i];
    for (const k of acc.postState.accounts.keys()) {
      if (!delta.has(k) || k === s) {
        n.set(k, acc.postState.accounts.get(k)!);
      }
    }
    for (const k of delta.keys()) {
      if (!acc.postState.accounts.has(k)) {
        m.add(k);
      }
    }
  }
  // console.log({ n });
  // console.log({ m });
  const tmpDelta: Delta = new Map([...delta.entries(), ...n.entries()]);
  for (const k of m) {
    tmpDelta.delete(k);
  }
  const delta_prime = preimageProvide(
    tmpDelta,
    accumulatedServices.map((a) => a.provision).flat(),
    deps.p_tau,
  );

  const {
    manager: m_prime,
    assigners: a_star,
    delegator: v_star,
    alwaysAccers: z_prime,
  } = singleServiceAccumulation(
    accState,
    works,
    f,
    accState.manager,
    deps,
  ).postState;

  const v_prime = singleServiceAccumulation(accState, works, f, v_star, deps)
    .postState.delegator;
  const i_prime = singleServiceAccumulation(
    accState,
    works,
    f,
    accState.delegator,
    deps,
  ).postState.stagingSet;

  const a_prime = [] as unknown as PVMAccumulationState["assigners"];
  for (let c = 0; c < CORES; c++) {
    a_prime[c] = singleServiceAccumulation(
      accState,
      works,
      f,
      a_star[c],
      deps,
    ).postState.assigners[c];
  }

  const q_prime = <AuthorizerQueue>(<unknown>[]);
  for (let c = 0; c < CORES; c++) {
    q_prime[c] = singleServiceAccumulation(
      accState,
      works,
      f,
      accState.assigners[c],
      deps,
    ).postState.authQueue[c];
  }

  const newState: PVMAccumulationState = {
    accounts: delta_prime,
    // i'
    stagingSet: i_prime,
    // q'
    authQueue: q_prime,
    manager: m_prime,
    assigners: a_prime,
    delegator: v_prime,
    alwaysAccers: z_prime,
  };

  return [newState, t, b, u];
};

// $(0.7.0 - 12.18) - \fnprovide
// also `P()` fn
const preimageProvide = (
  d: Delta,
  p: PVMResultContext["preimages"],
  p_tau: Posterior<Tau>,
) => {
  const newD = structuredClone(d);
  for (const { service, preimage } of p) {
    const phash = Hashing.blake2b(preimage);
    const plength: Tagged<u32, "length"> = toTagged(<u32>preimage.length);
    if (d.get(service)?.requests.get(phash)?.get(plength)?.length === 0) {
      newD
        .get(service)!
        .requests.get(phash)!
        .set(plength, toTagged(<Tau[]>[p_tau]));
      newD.get(service)!.preimages.set(phash, preimage);
    }
  }
  return newD;
};

/**
 * `∆1` fn
 * @param preState - `bold_e`
 * @param works - `bold_w`
 * @param gasPerService - `bold_f`
 * @param service - `s`
 * @see $(0.7.0 - 12.21)
 *
 */
export const singleServiceAccumulation = (
  preState: PVMAccumulationStateImpl,
  works: WorkReportImpl[],
  gasPerService: Map<ServiceIndex, u64>,
  service: ServiceIndex,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): AccumulationOutImpl => {
  let g = (gasPerService.get(service) || 0n) as Gas;
  works.forEach((wr) =>
    wr.digests
      .filter((r) => r.serviceIndex === service)
      .forEach((r) => (g = (g + r.gasLimit) as Gas)),
  );

  const i: PVMAccumulationOpImpl[] = [];
  for (const wr of works) {
    for (const r of wr.digests) {
      if (r.serviceIndex === service) {
        i.push(
          new PVMAccumulationOpImpl({
            result: r.result,
            gasLimit: r.gasLimit,
            payloadHash: r.payloadHash,
            authTrace: wr.authTrace,
            segmentRoot: wr.avSpec.segmentRoot,
            packageHash: wr.avSpec.packageHash,
            authorizerHash: wr.authorizerHash,
          }),
        );
      }
    }
  }
  return accumulateInvocation(preState, service, g, i, deps.p_tau, {
    p_tau: deps.p_tau,
    p_eta_0: deps.p_eta_0,
  });
};
