import {
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
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
  PVMResultContext,
  ServiceAccount,
} from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import { ok } from "neverthrow";
import { toTagged } from "@tsjam/utils";
import { accumulateInvocation } from "@tsjam/pvm";
import { Hashing } from "@tsjam/crypto";
import { ServiceOuts } from "../../jam-types/dist/types/states/ServiceOuts";

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
    p_mostRecentAccumulationOutputs: Posterior<ServiceOuts>; // `θ′`
    iota: JamState["iota"];
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
) => {
  /*
   * Integrate state to calculate several posterior state
   */
  const w_mark = noPrereqAvailableReports(w);

  const w_q = withPrereqAvailableReports(w, deps.accumulationHistory);
  // console.log({ w_q: w_q });
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    deps.accumulationQueue,
    deps.p_tau,
  );

  // $(0.6.7 - 12.21)
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES,
    TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) +
      [...deps.privServices.alwaysAccumulate.values()].reduce(
        (a, b) => a + b,
        0n,
      ),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.6.7 - 12.22)
  const [
    nAccumulatedWork,
    bold_o,
    bold_t,
    p_mostRecentAccumulationOutputs,
    bold_u,
  ] = outerAccumulation(
    g,
    w_star,
    {
      delta: deps.serviceAccounts,
      ...deps.privServices,
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

  // $(0.6.7 - 12.24) | I
  const accumulationStatistics: Map<
    ServiceIndex,
    { usedGas: Gas; count: u32 }
  > = new Map();

  const slicedW = w_star.slice(0, nAccumulatedWork);

  // $(0.6.7 - 12.25)
  bold_u.forEach(({ serviceIndex, usedGas }) => {
    if (!accumulationStatistics.has(serviceIndex)) {
      accumulationStatistics.set(serviceIndex, {
        usedGas: <Gas>0n,
        count: <u32>0,
      });
    }
    const el = accumulationStatistics.get(serviceIndex)!;
    el.usedGas = (el.usedGas + usedGas) as Gas;
  });

  for (const serviceIndex of accumulationStatistics.keys()) {
    // $(0.6.7 - 12.26)
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
  // $(0.6.7 - 12.33 / 12.34)
  const p_accumulationHistory =
    deps.accumulationHistory.slice() as AccumulationHistory as Posterior<AccumulationHistory>;
  {
    const w_dot_n = w_star.slice(0, nAccumulatedWork);
    p_accumulationHistory[EPOCH_LENGTH - 1] = P_fn(w_dot_n);
    for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
      p_accumulationHistory[i] = deps.accumulationHistory[i + 1];
    }
  } // end of calculation of posterior accumulation history

  // $(0.6.7 - 12.35) - calculate p_accumulationQueue
  const p_accumulationQueue = [
    ...deps.accumulationQueue,
  ] as Posterior<AccumulationQueue>;
  {
    const m = deps.p_tau % EPOCH_LENGTH; // $(0.6.4 - 12.10)

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
    deferredTransfers: bold_t,
    p_accumulationHistory,
    p_accumulationQueue,
    p_mostRecentAccumulationOutputs,
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
 * $(0.6.4 - 12.4)
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
 * $(0.6.4 - 12.2)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistory,
): AccumulationHistory[0] => {
  return toTagged(new Set(accHistory.map((a) => [...a.values()]).flat()));
};

/**
 * $(0.6.4 - 12.7)
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
 * $(0.6.4 - 12.5)
 */
export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: AccumulationHistory,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    E_Fn(
      // $(0.6.4 - 12.6) | D fn calculated inline
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
 * $(0.6.4 - 12.9)
 */
export const P_fn = (r: WorkReport[]): Set<WorkPackageHash> => {
  return new Set(r.map((wr) => wr.workPackageSpecification.workPackageHash));
};

/**
 * `Q` fn
 * $(0.6.4 - 12.8)
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
 * $(0.6.4 - 12.11)
 */
export const accumulatableReports = (
  w_mark: ReturnType<typeof noPrereqAvailableReports>,
  w_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueue,
  p_tau: Posterior<Tau>, // Ht
) => {
  // $(0.6.4 - 12.10)
  const m = p_tau % EPOCH_LENGTH;

  // console.log("W_Q", w_q);
  const accprio = computeAccumulationPriority(
    // $(0.6.4 - 12.12)
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

// $(0.6.6 - 12.15)
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
  ServiceOuts,
  U,
] => {
  let sum = 0n;
  let i = 0;
  // TODO: rewrite this to a more elegant solution
  for (const w of works) {
    sum += w.results.reduce((a, r) => a + r.gasLimit, 0n);
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

// $(0.6.5 - 12.18) - \fnprovide
const preimageProvide = (
  d: Map<ServiceIndex, ServiceAccount>,
  p: PVMResultContext["preimages"],
  p_tau: Posterior<Tau>,
) => {
  const newD = structuredClone(d);
  for (const { service, preimage } of p) {
    const serviceAccount = newD.get(service);
    const phash = Hashing.blake2b(preimage);
    if (
      typeof serviceAccount !== "undefined" &&
      serviceAccount.preimage_l.get(phash)?.get(toTagged(<u32>preimage.length))
        ?.length === 0
    ) {
      const newSa = newD.get(service)!;
      newSa.preimage_l
        .get(phash)!
        .set(toTagged(<u32>preimage.length), toTagged(<Tau[]>[p_tau]));
      newSa.preimage_p.set(phash, preimage);
    }
  }
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
  b: ServiceOuts,
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
  const b: ServiceOuts = new Set();

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
  const {
    manager: m_prime,
    assign: a_star,
    designate: v_star,
    alwaysAccumulate: z_prime,
  } = singleServiceAccumulation(o, w, f, o.manager, deps).o;

  const v_prime = singleServiceAccumulation(o, w, f, v_star, deps).o.designate;
  const i_prime = singleServiceAccumulation(o, w, f, o.designate, deps).o
    .validatorKeys;

  const a_prime = [] as unknown as PVMAccumulationState["assign"];
  for (let c = 0; c < CORES; c++) {
    a_prime[c] = singleServiceAccumulation(o, w, f, a_star[c], deps).o.assign[
      c
    ];
  }

  const q_prime = [] as unknown as PVMAccumulationState["authQueue"];
  for (let c = 0; c < CORES; c++) {
    q_prime[c] = singleServiceAccumulation(
      o,
      w,
      f,
      o.assign[c],
      deps,
    ).o.authQueue[c];
  }

  // TODO: if same service index just call once the accumulation and use the result

  const newState: PVMAccumulationState = {
    delta: delta_prime,
    // i'
    validatorKeys: i_prime,
    // q'
    authQueue: singleServiceAccumulation(o, w, f, o.designate, deps).o
      .authQueue,
    manager: m_prime,
    assign: a_prime,
    designate: v_prime,
    alwaysAccumulate: z_prime,
  };

  return [newState, t, b, u];
};

/**
 * `∆1` fn
 * $(0.6.5 - 12.20)
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
  p: PVMResultContext["preimages"];
} => {
  let g = (f.get(s) || 0n) as Gas;
  w.forEach((wr) =>
    wr.results
      .filter((r) => r.serviceIndex === s)
      .forEach((r) => (g = (g + r.gasLimit) as Gas)),
  );

  const i: PVMAccumulationOp[] = [];
  for (const wr of w) {
    for (const r of wr.results) {
      if (r.serviceIndex === s) {
        i.push({
          output: r.result,
          gasLimit: r.gasLimit,
          payloadHash: r.payloadHash,
          authorizerOutput: wr.authorizerOutput,
          segmentRoot: wr.workPackageSpecification.segmentRoot,
          workPackageHash: wr.workPackageSpecification.workPackageHash,
          authorizerHash: wr.authorizerHash,
        });
      }
    }
  }
  const [_o, t, b, u, preimages] = accumulateInvocation(
    o,
    s,
    g,
    i,
    deps.p_tau,
    {
      p_tau: deps.p_tau,
      p_eta_0: deps.p_eta_0,
    },
  );
  return { o: _o, t, b, u, p: preimages };
};
