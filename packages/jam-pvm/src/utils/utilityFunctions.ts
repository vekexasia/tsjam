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
  Hash,
  PVMAccumulationOp,
  PVMAccumulationState,
  RHO,
  ServiceIndex,
  Tagged,
  Tau,
  WorkPackageHash,
  WorkReport,
  u64,
} from "@tsjam/types";
import { CORES, EPOCH_LENGTH, MINIMUM_VALIDATORS } from "@tsjam/constants";
import { toTagged } from "@tsjam/utils";
import { accumulateInvocation } from "@/invocations/accumulate.js";

/**
 *
 * (130) `W` in the paper section
 * 11.2.2
 * @param ea - Availability Extrinsic
 * @param d_rho - dagger rho
 */
export const availableReports = (
  ea: EA_Extrinsic,
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
 * (159)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistory,
): AccumulationHistory[0] => {
  return new Map(accHistory.map((a) => [...a.entries()]).flat());
};

const E_Fn = (
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
 * (162) Section 12.2
 */
export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: Map<WorkPackageHash, Hash>,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    E_Fn(
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
      accHistory,
    ),
  );
};

//TODO: this is being used also in transitions but currently being copied over
const P_fn = (r: WorkReport[]): Map<WorkPackageHash, Hash> => {
  return new Map(
    r.map((wr) => [
      wr.workPackageSpecification.workPackageHash,
      wr.workPackageSpecification.segmentRoot,
    ]),
  );
};

/**
 * (165) in the paper
 * defined in `Q`
 */
export const computeAccumulationPriority = (
  r: Array<{ workReport: WorkReport; dependencies: Set<WorkPackageHash> }>,
  a: Map<WorkPackageHash, Hash>,
): WorkReport[] => {
  const g = r
    .filter(({ dependencies }) => dependencies.size === 0)
    .map(({ workReport }) => workReport);
  if (g.length === 0) {
    return [];
  }
  const pg = P_fn(g);

  return [
    ...g,
    ...computeAccumulationPriority(
      E_Fn(r, pg),
      new Map([...a.entries(), ...pg.entries()]),
    ),
  ];
};

/**
 * `W*` in the paper
 * (168)
 */
export const accumulatableReports = (
  w_mark: ReturnType<typeof noPrereqAvailableReports>,
  w_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueue,
  accHistory: AccumulationHistory,
  tau: Tau, // Ht
) => {
  const m = tau % EPOCH_LENGTH;

  return [
    ...w_mark,
    ...computeAccumulationPriority(
      [
        ...accumulationQueue.slice(m).flat(),
        ...accumulationQueue.slice(0, m).flat(),
        ...w_q,
      ],
      accHistoryUnion(accHistory),
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
  let g = f.get(s) || toTagged(0n);
  w.forEach((wr) =>
    wr.results.forEach((r) => (g = toTagged(g + r.gasPrioritization))),
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
