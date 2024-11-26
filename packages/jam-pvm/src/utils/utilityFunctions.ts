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
  PVMAccumulationOp,
  PVMAccumulationState,
  RHO,
  ServiceIndex,
  Tagged,
  Tau,
  Validated,
  WorkPackageHash,
  WorkReport,
  u64,
} from "@tsjam/types";
import { CORES, EPOCH_LENGTH, MINIMUM_VALIDATORS } from "@tsjam/constants";
import { toTagged } from "@tsjam/utils";
import { accumulateInvocation } from "@/invocations/accumulate.js";

/**
 * `bold W`
 * $(0.5.0 - 11.15)
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
    if (sum > MINIMUM_VALIDATORS) {
      W.push(d_rho[c]!.workReport);
    }
  }
  return toTagged(W);
};

/**
 * Computes  `W!` in the paper
 * $(0.5.0 - 12.4)
 */
export const noPrereqAvailableReports = (
  w: AvailableWorkReports,
): AvailableNoPrereqWorkReports => {
  return toTagged(
    w.filter(
      (wr) =>
        typeof wr.refinementContext.requiredWorkPackage === "undefined" &&
        wr.segmentRootLookup.size === 0,
    ),
  );
};

/**
 * Computes the union of the AccumulationHistory
 * $(0.5.0 - 12.2)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistory,
): AccumulationHistory[0] => {
  return toTagged(new Set(accHistory.map((a) => [...a.values()]).flat()));
};

/**
 * $(0.5.0 - 12.7)
 */
export const E_Fn = (
  r: AccumulationQueue[0],
  x: AccumulationHistory[0],
): AccumulationQueue[0] => {
  const keys = new Set(x.keys());
  const filteredR = r
    .filter(
      (r) => !keys.has(r.workReport.workPackageSpecification.workPackageHash),
    )
    .filter((r) => {
      const xwl = new Map([
        ...x.entries(),
        ...r.workReport.segmentRootLookup.entries(),
      ]);
      const wlx = new Map([
        ...r.workReport.segmentRootLookup.entries(),
        ...x.entries(),
      ]);

      // check they're the same
      for (const [k, v] of xwl.entries()) {
        if (wlx.get(k) !== v) {
          return false;
        }
      }
      return true;
    });

  const toRet: AccumulationQueue[0] = [];
  for (const { workReport, dependencies } of filteredR) {
    const newDeps = new Set(dependencies);
    workReport.workPackageSpecification.workPackageHash;
    keys.forEach((a) => newDeps.delete(a));
    toRet.push({ workReport, dependencies: newDeps });
  }
  return toRet;
};

/**
 * `WQ` in the paper
 * $(0.5.0 - 12.5)
 */
export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: AccumulationHistory,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    E_Fn(
      // $(0.5.0 - 12.6) | D fn calculated inline
      w
        .filter((wr) => {
          return (
            typeof wr.refinementContext.requiredWorkPackage !== "undefined" ||
            wr.segmentRootLookup.size > 0
          );
        })
        .map((wr) => {
          const deps = new Set<WorkPackageHash>(wr.segmentRootLookup.keys());
          if (typeof wr.refinementContext.requiredWorkPackage !== "undefined") {
            deps.add(wr.refinementContext.requiredWorkPackage);
          }
          return { workReport: wr, dependencies: deps };
        }),
      accHistoryUnion(accHistory),
    ),
  );
};

/**
 * $(0.5.0 - 12.9)
 */
export const P_fn = (r: WorkReport[]): Set<WorkPackageHash> => {
  return new Set(r.map((wr) => wr.workPackageSpecification.workPackageHash));
};

/**
 * `Q` fn
 * $(0.5.0 - 12.8)
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
 * $(0.5.0 - 12.11)
 */
export const accumulatableReports = (
  w_mark: ReturnType<typeof noPrereqAvailableReports>,
  w_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueue,
  tau: Tau, // Ht
) => {
  // $(0.5.0 - 12.10)
  const m = tau % EPOCH_LENGTH;

  return [
    ...w_mark,
    ...computeAccumulationPriority(
      // $(0.5.0 - 12.12)
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
 */
export const outerAccumulation = (
  gasLimit: u64,
  works: WorkReport[],
  accState: PVMAccumulationState,
  gasLimits: Map<ServiceIndex, u64>,
  tau: Tau,
): [
  nAccumulatedWork: number,
  accState: PVMAccumulationState,
  transfers: DeferredTransfer[],
  Set<{ serviceIndex: ServiceIndex; accumulationResult: Hash }>,
] => {
  let sum = 0n;
  let i = 0;
  // TODO: rewrite this to a more elegant solution
  for (const w of works) {
    sum += w.results.reduce((a, r) => a + r.gasPrioritization, 0n);
    if (sum > gasLimit) {
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
    tau,
  );
  const [j, o_prime, t, b] = outerAccumulation(
    toTagged(gasLimit - g_star),
    works.slice(i),
    o_star,
    new Map(),
    tau,
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
 */
export const parallelizedAccAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  tau: Tau,
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
    singleServiceAccumulation(o, w, f, s, tau),
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

  const delta: Delta = new Map([
    ...o.delta.entries(),
    ...[
      ...accumulatedServices.map(({ o: op }) => [...op.delta.entries()]),
    ].flat(),
  ]);

  // NOTE: We note that all newly added service indices, defined in the above context as ⋃s∈s K((∆1(o, w, s)o)d) ∖ s, must not conflict with the indices of existing services K(δ) or other newly added services. This should never happen, since new indices are explicitly selected to avoid such conflicts, but in the unlikely event it happens, the block must be considered invalid

  const newState: PVMAccumulationState = {
    delta,
    privServices: singleServiceAccumulation(o, w, f, o.privServices.m, tau).o
      .privServices,
    authQueue: singleServiceAccumulation(o, w, f, o.privServices.v, tau).o
      .authQueue,
    validatorKeys: singleServiceAccumulation(o, w, f, o.privServices.a, tau).o
      .validatorKeys,
  };

  return [toTagged(u), newState, t, b];
};

/**
 * `∆1` fn
 */
export const singleServiceAccumulation = (
  o: PVMAccumulationState,
  w: WorkReport[],
  f: Map<ServiceIndex, u64>,
  s: ServiceIndex,
  tau: Tau,
): {
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
  const [_o, t, b, u] = accumulateInvocation(o, s, g, p, tau);
  return { o: _o, t, b, u };
};
