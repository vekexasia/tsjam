import {
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import { calculateAccumulateRoot } from "@tsjam/transitions";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerQueue,
  AvailableWorkReports,
  Delta,
  Gas,
  JamState,
  Posterior,
  PrivilegedServices,
  Tau,
  AvailableNoPrereqWorkReports,
  AvailableWithPrereqWorkReports,
  Dagger,
  DeferredTransfer,
  EA_Extrinsic,
  Hash,
  PVMAccumulationOp,
  PVMAccumulationState,
  RHO,
  ServiceIndex,
  Tagged,
  Validated,
  WorkPackageHash,
  WorkReport,
  u64,
  u32,
} from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import { ok } from "neverthrow";
import { toTagged } from "@tsjam/utils";
import { accumulateInvocation } from "@tsjam/pvm";

/**
 * Decides which reports to accumulate and accumulates them
 * computes a series of posterior states
 */
export const accumulateReports = (
  w: AvailableWorkReports,
  deps: {
    accumulationHistory: AccumulationHistory;
    accumulationQueue: AccumulationQueue;
    authQueue: AuthorizerQueue;
    serviceAccounts: Delta;
    tau: Tau;
    p_tau: Posterior<Tau>;
    privServices: PrivilegedServices;
    iota: JamState["iota"];
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
) => {
  /*
   * Integrate state to calculate several posterior state
   */
  const w_mark = noPrereqAvailableReports(w);

  //console.log(
  //  JSON.stringify(
  //    { w_mark: ArrayOfJSONCodec(WorkReportJSONCodec).toJSON(w_mark) },
  //    null,
  //    2,
  //  ),
  //);
  const w_q = withPrereqAvailableReports(w, deps.accumulationHistory);
  // console.log({ w_q: w_q });
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    deps.accumulationQueue,
    deps.p_tau,
  );
  //console.log(
  //  JSON.stringify(
  //    { w_star: ArrayOfJSONCodec(WorkReportJSONCodec).toJSON(w_star) },
  //    null,
  //    2,
  //  ),
  //);

  // $(0.6.4 - 12.20)
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES,
    TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) +
      [...deps.privServices.alwaysAccumulate.values()].reduce(
        (a, b) => a + b,
        0n,
      ),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.6.4 - 12.21)
  const [nAccumulatedWork, bold_o, bold_t, C, bold_u] = outerAccumulation(
    g,
    w_star,
    {
      delta: deps.serviceAccounts,
      privServices: deps.privServices,
      authQueue: deps.authQueue,
      validatorKeys: deps.iota,
    },
    deps.privServices.alwaysAccumulate,
    {
      tau: deps.tau,
      p_tau: deps.p_tau,
      p_eta_0: deps.p_eta_0,
    },
  );

  // $(0.6.4 - 12.23) | I
  const accumulationStatistics: Map<
    ServiceIndex,
    { usedGas: Gas; count: u32 }
  > = new Map();

  const slicedW = w_star.slice(0, nAccumulatedWork);

  // $(0.6.4 - 12.24)
  bold_u.forEach(({ serviceIndex, usedGas }) => {
    if (!accumulationStatistics.has(serviceIndex)) {
      accumulationStatistics.set(serviceIndex, {
        usedGas: <Gas>0n,
        count: <u32>0,
      });
    }
    const el = accumulationStatistics.get(serviceIndex)!;
    //el.accumulatedReports++;
    el.usedGas = (el.usedGas + usedGas) as Gas;
  });

  for (const serviceIndex of accumulationStatistics.keys()) {
    // $(0.6.4 - 12.25)
    const n_s = slicedW
      .map((wr) => wr.results)
      .flat()
      .filter((r) => r.serviceIndex === serviceIndex);
    if (n_s.length === 0) {
      // how can this happen?
      accumulationStatistics.delete(serviceIndex);
    } else {
      accumulationStatistics.get(serviceIndex)!.count = <u32>n_s.length;
    }
  }

  // calculoate posterior acc history
  // $(0.6.1 - 12.25 / 12.26)
  const p_accumulationHistory =
    deps.accumulationHistory.slice() as AccumulationHistory as Posterior<AccumulationHistory>;
  {
    const w_dot_n = w_star.slice(0, nAccumulatedWork);
    p_accumulationHistory[EPOCH_LENGTH - 1] = P_fn(w_dot_n);
    for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
      p_accumulationHistory[i] = deps.accumulationHistory[i + 1];
    }
  } // end of calculation of posterior accumulation history

  // $(0.6.1 - 12.27) - calculate p_accumulationQueue
  const p_accumulationQueue = [
    ...deps.accumulationQueue,
  ] as Posterior<AccumulationQueue>;
  {
    const m = deps.p_tau % EPOCH_LENGTH; // $(0.6.1 - 12.10)

    for (let i = 0; i < EPOCH_LENGTH; i++) {
      const index = (m - i + EPOCH_LENGTH) % EPOCH_LENGTH;
      if (i === 0) {
        p_accumulationQueue[index] = toPosterior(
          E_Fn(w_q, p_accumulationHistory[EPOCH_LENGTH - 1]),
        );
      } else if (i < deps.p_tau - deps.tau) {
        p_accumulationQueue[index] = toPosterior([]);
      } else {
        p_accumulationQueue[index] = toPosterior(
          E_Fn(
            p_accumulationQueue[index],
            p_accumulationHistory[EPOCH_LENGTH - 1],
          ),
        );
      }
    }
  } // end of calculation of posterior accumulation queue

  return ok({
    accumulateRoot: calculateAccumulateRoot(C),
    deferredTransfers: bold_t,
    p_accumulationHistory,
    p_accumulationQueue,
    // $(0.6.4 - 12.22)
    p_privServices: toPosterior(bold_o.privServices),
    d_delta: toDagger(bold_o.delta),
    p_iota: toPosterior(bold_o.validatorKeys),
    p_authQueue: toPosterior(bold_o.authQueue),
    accumulationStatistics,
  });
};

/**
 * `bold W`
 * $(0.6.4 - 11.16)
 * @param ea - Availability Extrinsic
 * @param d_rho - dagger rho
 */
export const availableReports = (
  ea: Validated<EA_Extrinsic>,
  d_rho: Dagger<RHO>,
): AvailableWorkReports => {
  const W: WorkReport[] = [];
  for (let c = 0; c < CORES; c++) {
    const sum = ea.reduce((acc, curr) => {
      return acc + curr.bitstring[c];
    }, 0);

    if (sum > (NUMBER_OF_VALIDATORS * 2) / 3) {
      W.push(d_rho[c]!.workReport);
    }
  }
  return toTagged(W);
};

/**
 * Computes  `W!` in the paper
 * $(0.6.1 - 12.4)
 */
export const noPrereqAvailableReports = (
  w: AvailableWorkReports,
): AvailableNoPrereqWorkReports => {
  return toTagged(
    w.filter(
      (wr) =>
        wr.refinementContext.dependencies.length === 0 &&
        wr.segmentRootLookup.size === 0,
    ),
  );
};

/**
 * Computes the union of the AccumulationHistory
 * $(0.6.1 - 12.2)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistory,
): AccumulationHistory[0] => {
  return toTagged(new Set(accHistory.map((a) => [...a.values()]).flat()));
};

/**
 * $(0.6.1 - 12.7)
 */
export const E_Fn = (
  r: AccumulationQueue[0],
  x: AccumulationHistory[0],
): AccumulationQueue[0] => {
  const toRet: AccumulationQueue[0] = [];

  for (const { workReport, dependencies } of r) {
    // (ws)h ~∈ x
    if (x.has(workReport.workPackageSpecification.workPackageHash)) {
      continue;
    }

    const newDeps = new Set(dependencies);
    x.forEach((packageHash) => newDeps.delete(packageHash));
    toRet.push({ workReport, dependencies: newDeps });
  }
  return toRet;
};

/**
 * `WQ` in the paper
 * $(0.6.1 - 12.5)
 */
export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: AccumulationHistory,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    E_Fn(
      // $(0.6.1 - 12.6) | D fn calculated inline
      w
        .filter((wr) => {
          return (
            wr.refinementContext.dependencies.length > 0 ||
            wr.segmentRootLookup.size > 0
          );
        })
        .map((wr) => {
          const deps = new Set<WorkPackageHash>(wr.segmentRootLookup.keys());
          wr.refinementContext.dependencies.forEach((rwp) => deps.add(rwp));

          return { workReport: wr, dependencies: deps };
        }),
      accHistoryUnion(accHistory),
    ),
  );
};

/**
 * $(0.6.1 - 12.9)
 */
export const P_fn = (r: WorkReport[]): Set<WorkPackageHash> => {
  return new Set(r.map((wr) => wr.workPackageSpecification.workPackageHash));
};

/**
 * `Q` fn
 * $(0.6.1 - 12.8)
 */
export const computeAccumulationPriority = (
  r: Array<{ workReport: WorkReport; dependencies: Set<WorkPackageHash> }>,
): WorkReport[] => {
  const g = r
    .filter(({ dependencies }) => dependencies.size === 0)
    .map(({ workReport }) => workReport);
  if (g.length === 0) {
    return [];
  }

  return [...g, ...computeAccumulationPriority(E_Fn(r, P_fn(g)))];
};

/**
 * `W*` in the paper
 * $(0.6.1 - 12.11)
 */
export const accumulatableReports = (
  w_mark: ReturnType<typeof noPrereqAvailableReports>,
  w_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueue,
  p_tau: Posterior<Tau>, // Ht
) => {
  // $(0.6.1 - 12.10)
  const m = p_tau % EPOCH_LENGTH;

  // console.log("W_Q", w_q);
  const accprio = computeAccumulationPriority(
    // $(0.6.1 - 12.12)
    E_Fn(
      [
        ...accumulationQueue.slice(m).flat(),
        ...accumulationQueue.slice(0, m).flat(),
        ...w_q,
      ],
      P_fn(w_mark),
    ),
  );
  // console.log("Q(q)", ArrayOfJSONCodec(WorkReportJSONCodec).toJSON(accprio));
  return [...w_mark, ...accprio] as Tagged<WorkReport[], "W*">;
};

// $(0.6.4 - 12.15)
/*
 * `servouts`
 */
type B = Set<{ serviceIndex: ServiceIndex; accumulationResult: Hash }>;
/*
 * `gasusd` gas used by each service
 */
type U = Array<{
  // `s`
  serviceIndex: ServiceIndex;
  // `u`
  usedGas: Gas;
}>;

/**
 * `∆+`
 * $(0.6.4 - 12.16)
 */
export const outerAccumulation = (
  gasLimit: Gas, // g
  works: WorkReport[], // w
  accState: PVMAccumulationState, // o
  gasLimits: Map<ServiceIndex, u64>, // f
  deps: {
    tau: Tau;
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): [
  nAccumulatedWork: number,
  accState: PVMAccumulationState,
  transfers: DeferredTransfer[],
  B,
  U,
] => {
  let sum = 0n;
  let i = 0;
  // TODO: rewrite this to a more elegant solution
  for (const w of works) {
    sum += w.results.reduce((a, r) => a + r.gasPrioritization, 0n);
    if (sum <= gasLimit) {
      i++;
    } else {
      break;
    }
  }

  if (i == 0) {
    return [0, accState, [], new Set(), []];
  }

  const [o_star, t_star, b_star, u_star] = parallelizedAccAccumulation(
    accState,
    works.slice(0, i),
    gasLimits,
    deps,
  );
  const consumedGas = u_star
    .map((a) => a.usedGas)
    .reduce((s, e) => <Gas>(s + e), <Gas>0n);

  const [j, o_prime, t, b, u] = outerAccumulation(
    (gasLimit - consumedGas) as Gas,
    works.slice(i),
    o_star,
    new Map(),
    deps,
  );

  return [
    i + j,
    o_prime,
    t_star.concat(t),
    new Set([...b_star.values(), ...b.values()]),
    u_star.concat(u),
  ];
};

/**
 * `∆*` fn
 * $(0.6.4 - 12.17)
 */
export const parallelizedAccAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): [
  accState: PVMAccumulationState,
  transfers: DeferredTransfer[],
  b: B,
  u: U,
] => {
  const bold_s = new Set([
    ...w.map((wr) => wr.results.map((r) => r.serviceIndex)).flat(),
    ...f.keys(),
  ]);
  const bold_s_values = [...bold_s.values()];
  // console.log(
  //  "∆* services:",
  // w.map((wr) => wr.results.map((r) => r.serviceIndex)).flat(),
  //  );

  const u: U = [];
  const accumulatedServices: Array<
    ReturnType<typeof singleServiceAccumulation>
  > = [];
  const b: B = new Set();

  bold_s_values.forEach((s) => {
    const acc = singleServiceAccumulation(o, w, f, s, deps);

    u.push({ serviceIndex: s, usedGas: acc.u });
    accumulatedServices.push(acc);

    if (typeof acc.b !== "undefined") {
      b.add({ serviceIndex: s, accumulationResult: acc.b! });
    }
  });

  const t = accumulatedServices
    .reduce((a, { t }) => a.concat(t), [] as DeferredTransfer[])
    .flat();

  const delta: Delta = new Map([...o.delta.entries()]);
  // should contain "removed" services
  const m: Set<ServiceIndex> = new Set();
  // should contain "added/updated" services
  const n: Delta = new Map();
  for (let i = 0; i < bold_s_values.length; i++) {
    const s = bold_s_values[i];
    const acc = accumulatedServices[i];
    for (const k of acc.o.delta.keys()) {
      if (!delta.has(k) || k === s) {
        n.set(k, acc.o.delta.get(k)!);
      }
    }
    for (const k of delta.keys()) {
      if (!acc.o.delta.has(k)) {
        m.add(k);
      }
    }
  }
  // console.log({ n });
  // console.log({ m });
  const delta_prime: Delta = new Map([...delta.entries(), ...n.entries()]);
  for (const k of m) {
    delta_prime.delete(k);
  }

  // TODO: if same service index just call once the accumulation and use the result

  const newState: PVMAccumulationState = {
    delta: delta_prime,
    // x'
    privServices: singleServiceAccumulation(o, w, f, o.privServices.bless, deps)
      .o.privServices,
    // i'
    validatorKeys: singleServiceAccumulation(
      o,
      w,
      f,
      o.privServices.assign,
      deps,
    ).o.validatorKeys,
    // q'
    authQueue: singleServiceAccumulation(
      o,
      w,
      f,
      o.privServices.designate,
      deps,
    ).o.authQueue,
  };

  return [newState, t, b, u];
};

/**
 * `∆1` fn
 * $(0.6.4 - 12.19)
 */
export const singleServiceAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  s: ServiceIndex,
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): {
  o: PVMAccumulationState;
  t: DeferredTransfer[];
  b: Hash | undefined;
  u: Gas;
} => {
  let g = (f.get(s) || 0n) as Gas;
  w.forEach((wr) =>
    wr.results
      .filter((r) => r.serviceIndex === s)
      .forEach((r) => (g = (g + r.gasPrioritization) as Gas)),
  );

  const p: PVMAccumulationOp[] = [];
  for (const wr of w) {
    for (const r of wr.results) {
      if (r.serviceIndex === s) {
        p.push({
          output: r.output,
          segmentRoot: wr.workPackageSpecification.segmentRoot,
          authorizerOutput: wr.authorizerOutput,
          payloadHash: r.payloadHash,
          workPackageHash: wr.workPackageSpecification.workPackageHash,
          authorizerHash: wr.authorizerHash,
        });
      }
    }
  }
  const [_o, t, b, u] = accumulateInvocation(o, s, g, p, deps.p_tau, {
    p_tau: deps.p_tau,
    p_eta_0: deps.p_eta_0,
  });
  return { o: _o, t, b, u };
};
