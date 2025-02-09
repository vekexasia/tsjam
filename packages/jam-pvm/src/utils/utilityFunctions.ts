import {
  AccumulationHistory,
  AccumulationQueue,
  AvailableNoPrereqWorkReports,
  AvailableWithPrereqWorkReports,
  AvailableWorkReports,
  Dagger,
  DeferredTransfer,
  Delta,
  EA_Extrinsic,
  Gas,
  Hash,
  JamState,
  PVMAccumulationOp,
  PVMAccumulationState,
  Posterior,
  RHO,
  ServiceIndex,
  Tagged,
  Tau,
  Validated,
  WorkPackageHash,
  WorkReport,
  u64,
} from "@tsjam/types";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { toTagged } from "@tsjam/utils";
import { accumulateInvocation } from "@/invocations/accumulate.js";

/**
 * `bold W`
 * $(0.6.1 - 11.15)
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
        wr.refinementContext.requiredWorkPackages.length === 0 &&
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
            wr.refinementContext.requiredWorkPackages.length > 0 ||
            wr.segmentRootLookup.size > 0
          );
        })
        .map((wr) => {
          const deps = new Set<WorkPackageHash>(wr.segmentRootLookup.keys());
          wr.refinementContext.requiredWorkPackages.forEach((rwp) =>
            deps.add(rwp),
          );

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

  return [
    ...w_mark,
    ...computeAccumulationPriority(
      // $(0.6.1 - 12.12)
      E_Fn(
        [
          ...accumulationQueue.slice(m).flat(),
          ...accumulationQueue.slice(0, m).flat(),
          ...w_q,
        ],
        P_fn(w_mark),
      ),
    ),
  ] as Tagged<WorkReport[], "W*">;
};

/**
 * `∆+`
 * $(0.6.1 - 12.16)
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
  // $(0.6.1 - 12.15)
  Set<{ serviceIndex: ServiceIndex; accumulationResult: Hash }>,
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
    return [0, accState, [], new Set()];
  }

  const [g_star, o_star, t_star, b_star] = parallelizedAccAccumulation(
    accState,
    works.slice(0, i),
    gasLimits,
    deps,
  );
  const [j, o_prime, t, b] = outerAccumulation(
    (gasLimit - g_star) as Gas,
    works.slice(i),
    o_star,
    new Map(),
    deps,
  );

  return [
    i + j,
    o_prime,
    t_star.concat(t),
    new Set([
      ...[...b_star.values()].map((item) => {
        return {
          serviceIndex: item.service,
          accumulationResult: item.hash,
        };
      }),
      ...b.values(),
    ]),
  ];
};

/**
 * `∆*` fn
 * $(0.6.1 - 12.17)
 */
export const parallelizedAccAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  deps: {
    tau: Tau;
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): [
  gas: u64,
  accState: PVMAccumulationState,
  transfers: DeferredTransfer[],
  b: Set<{ service: ServiceIndex; hash: Hash }>,
] => {
  const bold_s = new Set([
    ...w.map((wr) => wr.results.map((r) => r.serviceIndex)).flat(),
    ...f.keys(),
  ]);
  const bold_s_values = [...bold_s.values()];

  const accumulatedServices = bold_s_values.map((s) =>
    singleServiceAccumulation(o, w, f, s, deps),
  );

  const u = accumulatedServices.reduce((a, { u }) => a + u, 0n);
  const b = new Set<{ service: ServiceIndex; hash: Hash }>();

  for (let i = 0; i < bold_s_values.length; i++) {
    if (typeof accumulatedServices[i].b !== "undefined") {
      b.add({ service: bold_s_values[i], hash: accumulatedServices[i].b! });
    }
  }

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
  const delta_prime: Delta = new Map([...delta.entries(), ...n.entries()]);
  for (const k of m) {
    delta_prime.delete(k);
  }

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

  return [toTagged(u), newState, t, b];
};

/**
 * `∆1` fn
 * $(0.6.1 - 12.19)
 */
export const singleServiceAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  s: ServiceIndex,
  deps: {
    tau: Tau;
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): {
  // `O` tuple defined in $(0.6.1 - 12.18)
  o: PVMAccumulationState;
  t: DeferredTransfer[];
  b: Hash | undefined;
  u: u64;
} => {
  let g = (f.get(s) || 0n) as Gas;
  w.forEach((wr) =>
    wr.results.forEach((r) => (g = (g + r.gasPrioritization) as Gas)),
  );

  const p: PVMAccumulationOp[] = [];
  for (const wr of w) {
    for (const r of wr.results) {
      p.push({
        authorizationOutput: wr.authorizerOutput, // o
        output: r.output, // o
        payloadHash: r.payloadHash, // l
        packageHash: wr.workPackageSpecification.workPackageHash, // (ws)h
      });
    }
  }
  const [_o, t, b, u] = accumulateInvocation(o, s, g, p, deps.tau, {
    p_tau: deps.p_tau,
    p_eta_0: deps.p_eta_0,
  });
  return { o: _o, t, b, u };
};
