import {
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
} from "@tsjam/constants";
import {
  CoreIndex,
  Gas,
  GasUsed,
  JamEntropy,
  Posterior,
  ServiceIndex,
  Tagged,
  u64,
  Validated,
} from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";
import { AccumulationHistoryImpl } from "./impls/accumulation-history-impl";
import { AccumulationOutImpl } from "./impls/accumulation-out-impl";
import { AccumulationQueueImpl } from "./impls/accumulation-queue-impl";
import { AccumulationStatisticsImpl } from "./impls/accumulation-statistics-impl";
import { AuthorizerQueueImpl } from "./impls/authorizer-queue-impl";
import { DeferredTransfersImpl } from "./impls/deferred-transfers-impl";
import { DeltaImpl } from "./impls/delta-impl";
import { LastAccOutsImpl } from "./impls/last-acc-outs-impl";
import { NewWorkReportsImpl } from "./impls/new-work-reports-impl";
import { PrivilegedServicesImpl } from "./impls/privileged-services-impl";
import { AccumulationInputInpl } from "./impls/pvm/accumulation-input-impl";
import { PVMAccumulationOpImpl } from "./impls/pvm/pvm-accumulation-op-impl";
import { PVMAccumulationStateImpl } from "./impls/pvm/pvm-accumulation-state-impl";
import { SlotImpl, TauImpl } from "./impls/slot-impl";
import { ValidatorsImpl } from "./impls/validators-impl";
import { WorkReportImpl } from "./impls/work-report-impl";
import { accumulateInvocation } from "./pvm/invocations/accumulate";

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
    tau: SlotImpl;
    p_tau: Validated<Posterior<TauImpl>>;
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

  // $(0.7.1 - 12.24) | g
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES, //GT
    TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) + // GA*C
      [...deps.privServices.alwaysAccers.values()].reduce((a, b) => a + b, 0n),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.7.1 - 12.24) | e
  const preState = new PVMAccumulationStateImpl({
    accounts: deps.serviceAccounts,
    stagingSet: deps.iota,
    authQueue: deps.authQueue,
    manager: deps.privServices.manager,
    assigners: deps.privServices.assigners,
    delegator: deps.privServices.delegator,
    registrar: deps.privServices.registrar,
    alwaysAccers: deps.privServices.alwaysAccers,
  });

  // $(0.7.1 - 12.24)
  const {
    nAccumulatedWork, // `n`
    postAccState, // `e'`
    lastAccOutputs, // θ′
    gasUsed, // `bold u`
  } = outerAccumulation(
    g,
    new DeferredTransfersImpl([]),
    r_star,
    preState, // e
    deps.privServices.alwaysAccers,
    {
      p_tau: deps.p_tau,
      p_eta_0: deps.p_eta_0,
    },
  );

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

  // calculate p_accumulationQueue
  const p_accumulationQueue = deps.accumulationQueue.toPosterior({
    tau: deps.tau,
    p_tau: deps.p_tau,
    r_q,
    p_accumulationHistory: p_accumulationHistory,
  });
  // end of calculation of posterior accumulation queue

  return ok({
    p_accumulationHistory,
    p_accumulationQueue,
    p_mostRecentAccumulationOutputs: toPosterior(lastAccOutputs),
    p_privServices: toPosterior(
      new PrivilegedServicesImpl({
        manager: postAccState.manager,
        delegator: postAccState.delegator,
        assigners: postAccState.assigners,
        alwaysAccers: postAccState.alwaysAccers,
        registrar: postAccState.registrar,
      }),
    ),
    d_delta: toDagger(postAccState.accounts),
    p_iota: toPosterior(postAccState.stagingSet),
    p_authQueue: toPosterior(postAccState.authQueue),
    accumulationStatistics,
  });
};

/**
 * `∆+`
 * @param gasLimit - `g`
 * @param deferredTransfers - `bold_t`
 * @param works - `bold_r`
 * @param accState - `bold_e` initial partial accumulation state
 * @param freeAccServices - `bold_f`
 * @see $(0.7.1 - 12.18)
 */
export const outerAccumulation = (
  gasLimit: Gas,
  transfers: DeferredTransfersImpl,
  works: WorkReportImpl[],
  accState: PVMAccumulationStateImpl,
  freeAccServices: Map<ServiceIndex, Gas>,
  deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): {
  nAccumulatedWork: number;
  postAccState: PVMAccumulationStateImpl;
  lastAccOutputs: LastAccOutsImpl;
  gasUsed: GasUsed;
} => {
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
    return {
      nAccumulatedWork: 0,
      postAccState: accState,
      lastAccOutputs: new LastAccOutsImpl([]),
      gasUsed: <GasUsed>{ elements: [] },
    };
  }

  //const [newAccState /* e_star */, t_star, b_star, u_star]
  const {
    postAccState: newAccState /* e_star */,
    transfers: t_star,
    accOut: b_star,
    gasUsed: u_star,
  } = parallelizedAccumulation(
    accState,
    transfers,
    works.slice(0, i),
    freeAccServices,
    deps,
  );
  const consumedGas = u_star.elements
    .map((a) => a.gasUsed)
    .reduce((s, e) => <Gas>(s + e), <Gas>0n);

  // const [j, finalAccState /* e' */, t, b, u];
  const {
    postAccState: finalAccState /* e' */,
    lastAccOutputs: b,
    gasUsed: u,
    nAccumulatedWork: j,
  } = outerAccumulation(
    (gasLimit - consumedGas) as Gas,
    t_star,
    works.slice(i),
    newAccState,
    new Map(),
    deps,
  );
  return {
    nAccumulatedWork: i + j,
    postAccState: finalAccState,
    lastAccOutputs: LastAccOutsImpl.union(b_star, b),
    gasUsed: <GasUsed>{ elements: u_star.elements.concat(u.elements) },
  };
};

/**
 * `∆*` fn
 * @param accState - `bold_e` initial partial accumulation state
 * @param transfers - `bold_t`
 * @param works - `bold_w`
 *
 * $(0.7.1 - 12.19)
 * $(0.7.1 - 12.20) is calculated in place
 */
export const parallelizedAccumulation = (
  accState: PVMAccumulationStateImpl,
  transfers: DeferredTransfersImpl,
  works: WorkReportImpl[],
  bold_f: Map<ServiceIndex, Gas>,
  deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): {
  postAccState: PVMAccumulationStateImpl;
  transfers: DeferredTransfersImpl;
  /**
   * `bold b`
   */
  accOut: LastAccOutsImpl;
  /**
   * `bold u`
   */
  gasUsed: GasUsed;
} => {
  const bold_s = [
    ...new Set([
      ...works.map((wr) => wr.digests.map((r) => r.serviceIndex)).flat(),
      ...bold_f.keys(),
      ...transfers.elements.map((t) => t.destination),
    ]).values(),
  ];

  const bold_u = <GasUsed>{ elements: [] };
  const accumulatedServices: Array<AccumulationOutImpl> = [];
  const p_bold_t: DeferredTransfersImpl = new DeferredTransfersImpl([]);
  const bold_b = new LastAccOutsImpl([]);

  bold_s.forEach((s) => {
    const acc = singleServiceAccumulation(
      accState,
      transfers,
      works,
      bold_f,
      s,
      deps,
    );

    bold_u.elements.push({ serviceIndex: s, gasUsed: acc.gasUsed });

    if (typeof acc.yield !== "undefined") {
      bold_b.add(s, acc.yield);
    }

    // we concat directly here
    p_bold_t.elements.push(...acc.deferredTransfers.elements);

    accumulatedServices.push(acc);
  });

  const delta: DeltaImpl = accState.accounts.clone();

  // should contain "removed" services
  const m: Set<ServiceIndex> = new Set();
  // should contain "added/updated" services
  const n = new DeltaImpl();
  for (let i = 0; i < bold_s.length; i++) {
    const s = bold_s[i];
    const acc = accumulatedServices[i];
    for (const k of acc.postState.accounts.services()) {
      // if k is a new service and it's not the current one
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

  const tmpDelta = DeltaImpl.union(delta, n);
  for (const k of m) {
    tmpDelta.delete(k);
  }
  const delta_prime = tmpDelta.preimageIntegration(
    accumulatedServices.map((a) => a.provisions).flat(),
    deps.p_tau,
  );

  const eStar = singleServiceAccumulation(
    accState,
    transfers,
    works,
    bold_f,
    accState.manager,
    deps,
  ).postState;

  const a_prime = structuredClone(accState.assigners); // safe as of 0.7.1
  for (let c = <CoreIndex>0; c < CORES; c++) {
    if (accState.assigners[c] !== eStar.assigners[c]) {
      // if the assigner has changed, we need to accumulate it
      // otherwise we can just copy the state
      a_prime[c] = singleServiceAccumulation(
        accState,
        transfers,
        works,
        bold_f,
        eStar.assigners[c],
        deps,
      ).postState.assigners[c];
    }
  }

  let v_prime = structuredClone(accState.delegator); // safe as of 0.7.1
  if (accState.delegator !== eStar.delegator) {
    v_prime = singleServiceAccumulation(
      accState,
      transfers,
      works,
      bold_f,
      accState.delegator,
      deps,
    ).postState.delegator;
  }

  let r_prime = structuredClone(accState.registrar); // safe as of 0.7.1
  if (accState.registrar !== eStar.registrar) {
    r_prime = singleServiceAccumulation(
      accState,
      transfers,
      works,
      bold_f,
      accState.registrar,
      deps,
    ).postState.registrar;
  }

  const i_prime = singleServiceAccumulation(
    accState,
    transfers,
    works,
    bold_f,
    accState.delegator,
    deps,
  ).postState.stagingSet;

  const q_prime = new AuthorizerQueueImpl({ elements: toTagged([]) });
  for (let c = 0; c < CORES; c++) {
    q_prime.elements[c] = singleServiceAccumulation(
      accState,
      transfers,
      works,
      bold_f,
      accState.assigners[c],
      deps,
    ).postState.authQueue.elements[c];
  }

  const newState = new PVMAccumulationStateImpl({
    accounts: delta_prime,
    stagingSet: i_prime,
    authQueue: q_prime,
    manager: eStar.manager,
    assigners: a_prime,
    delegator: v_prime,
    registrar: r_prime,
    alwaysAccers: eStar.alwaysAccers,
  });

  return {
    postAccState: newState,
    transfers: p_bold_t,
    accOut: bold_b,
    gasUsed: bold_u,
  };
};

/**
 * `∆1` fn
 * @param preState - `bold_e`
 * @param transfers - `bold_t`
 * @param reports - `bold_r`
 * @param gasPerService - `bold_f`
 * @param service - `s`
 * @see $(0.7.1 - 12.23)
 *
 */
export const singleServiceAccumulation = (
  preState: PVMAccumulationStateImpl,
  transfers: DeferredTransfersImpl,
  reports: WorkReportImpl[],
  gasPerService: Map<ServiceIndex, u64>,
  service: ServiceIndex,
  deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): AccumulationOutImpl => {
  let g = (gasPerService.get(service) || 0n) as Gas;
  reports.forEach((wr) =>
    wr.digests
      .filter((r) => r.serviceIndex === service)
      .forEach((r) => (g = <Gas>(g + r.gasLimit))),
  );
  transfers.elements.forEach((t) => {
    if (t.destination === service) {
      g = <Gas>(g + t.gas);
    }
  });

  const bold_i: AccumulationInputInpl[] = [];
  for (const t of transfers.elements) {
    if (t.destination === service) {
      bold_i.push(
        new AccumulationInputInpl({
          transfer: t,
        }),
      );
    }
  }
  let core = <CoreIndex>0;

  for (const r of reports) {
    for (const d of r.digests) {
      if (d.serviceIndex === service) {
        core = r.core;
        bold_i.push(
          new AccumulationInputInpl({
            operand: new PVMAccumulationOpImpl({
              result: d.result,
              gasLimit: d.gasLimit,
              payloadHash: d.payloadHash,
              authTrace: r.authTrace,
              segmentRoot: r.avSpec.segmentRoot,
              packageHash: r.avSpec.packageHash,
              authorizerHash: r.authorizerHash,
            }),
          }),
        );
      }
    }
  }

  return accumulateInvocation(preState, deps.p_tau, service, g, bold_i, {
    core,
    p_tau: deps.p_tau,
    p_eta_0: deps.p_eta_0,
  });
};
