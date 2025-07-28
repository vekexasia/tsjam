import {
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  Gas,
  GasUsed,
  JamEntropy,
  PVMAccumulationState,
  PVMResultContext,
  Posterior,
  PrivilegedServices,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
  u64,
} from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";
import { AccumulationHistoryImpl } from "./classes/AccumulationHistoryImpl";
import { AccumulationOutImpl } from "./classes/AccumulationOutImpl";
import { AccumulationQueueImpl } from "./classes/AccumulationQueueImpl";
import { AccumulationStatisticsImpl } from "./classes/AccumulationStatisticsImpl";
import { AuthorizerQueueImpl } from "./classes/AuthorizerQueueImpl";
import { DeferredTransferImpl } from "./classes/DeferredTransferImpl";
import { DeferredTransfersImpl } from "./classes/DeferredTransfersImpl";
import { DeltaImpl } from "./classes/DeltaImpl";
import { LastAccOutsImpl } from "./classes/LastAccOutsImpl";
import { NewWorkReportsImpl } from "./classes/NewWorkReportsImpl";
import { PrivilegedServicesImpl } from "./classes/PrivilegedServicesImpl";
import { PVMAccumulationOpImpl } from "./classes/PVMAccumulationOPImpl";
import { PVMAccumulationStateImpl } from "./classes/PVMAccumulationStateImpl";
import { ValidatorsImpl } from "./classes/ValidatorsImpl";
import { WorkReportImpl } from "./classes/WorkReportImpl";
import { accumulateInvocation } from "./pvm";

/**
 * Decides which reports to accumulate and accumulates them
 * computes a series of posterior states
 */
export const accumulateReports = (
  r: NewWorkReportsImpl,
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

  const r_q = r.queueable(deps.accumulationHistory);

  // console.log({ w_q: w_q });
  const r_star = r.accumulatableReports({
    accQueue: deps.accumulationQueue,
    accHistory: deps.accumulationHistory,
    p_tau: deps.p_tau,
  });

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
    p_privServices: toPosterior(
      new PrivilegedServicesImpl({
        manager: postState.manager,
        delegator: postState.delegator,
        assigners: postState.assigners,
        alwaysAccers: postState.alwaysAccers,
        registrar: <ServiceIndex>0, // FIXME: 0.7.1
      }),
    ),
    d_delta: toDagger(postState.accounts),
    p_iota: toPosterior(postState.stagingSet),
    p_authQueue: toPosterior(postState.authQueue),
    accumulationStatistics,
  });
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
  works: WorkReportImpl[],
  accState: PVMAccumulationStateImpl,
  freeAccServices: Map<ServiceIndex, u64>,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): [
  nAccumulatedWork: number,
  accState: PVMAccumulationStateImpl,
  transfers: DeferredTransfersImpl,
  LastAccOutsImpl,
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
    return [
      0,
      accState,
      new DeferredTransfersImpl([]),
      new LastAccOutsImpl([]),
      <GasUsed>{ elements: [] },
    ];
  }

  const [newAccState /* e_star */, t_star, b_star, u_star] =
    parallelizedAccumulation(
      accState,
      works.slice(0, i),
      freeAccServices,
      deps,
    );
  const consumedGas = u_star.elements
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
    new DeferredTransfersImpl(t_star.concat(t.elements)),
    LastAccOutsImpl.union(b_star, b),
    <GasUsed>{ elements: u_star.elements.concat(u.elements) },
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
  works: WorkReportImpl[],
  f: Map<ServiceIndex, u64>,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): [
  accState: PVMAccumulationStateImpl,
  transfers: DeferredTransferImpl[],
  b: LastAccOutsImpl,
  u: GasUsed,
] => {
  const bold_s = [
    ...new Set([
      ...works.map((wr) => wr.digests.map((r) => r.serviceIndex)).flat(),
      ...f.keys(),
    ]).values(),
  ];

  const u = <GasUsed>{ elements: [] };
  const accumulatedServices: Array<
    ReturnType<typeof singleServiceAccumulation>
  > = [];
  const t: DeferredTransferImpl[] = [];
  const b = new LastAccOutsImpl([]);

  bold_s.forEach((s) => {
    const acc = singleServiceAccumulation(accState, works, f, s, deps);

    u.elements.push({ serviceIndex: s, gasUsed: acc.gasUsed });
    accumulatedServices.push(acc);

    if (typeof acc.yield !== "undefined") {
      b.add(s, acc.yield);
    }
    // we concat directly here
    t.push(...acc.deferredTransfers);
  });

  const delta: DeltaImpl = structuredClone(accState.accounts);

  // should contain "removed" services
  const m: Set<ServiceIndex> = new Set();
  // should contain "added/updated" services
  const n = new DeltaImpl();
  for (let i = 0; i < bold_s.length; i++) {
    const s = bold_s[i];
    const acc = accumulatedServices[i];
    for (const k of acc.postState.accounts.services()) {
      if (!delta.has(k) || k === s) {
        n.set(k, acc.postState.accounts.get(k)!);
      }
    }
    for (const k of delta.services()) {
      if (!acc.postState.accounts.has(k)) {
        m.add(k);
      }
    }
  }
  // console.log({ n });
  // console.log({ m });

  const tmpDelta = DeltaImpl.union(delta, n);
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

  const q_prime = new AuthorizerQueueImpl();
  for (let c = 0; c < CORES; c++) {
    q_prime.elements[c] = singleServiceAccumulation(
      accState,
      works,
      f,
      accState.assigners[c],
      deps,
    ).postState.authQueue.elements[c];
  }

  const newState = new PVMAccumulationStateImpl({
    accounts: delta_prime,
    // i'
    stagingSet: i_prime,
    // q'
    authQueue: q_prime,
    manager: m_prime,
    assigners: a_prime,
    delegator: v_prime,
    alwaysAccers: z_prime,
  });

  return [newState, t, b, u];
};

// $(0.7.0 - 12.18) - \fnprovide
// also `P()` fn
const preimageProvide = (
  d: DeltaImpl,
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
