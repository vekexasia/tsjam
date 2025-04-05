import { epochIndex, toPosterior } from "@tsjam/utils";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerPool,
  BeefyRootHash,
  Dagger,
  Delta,
  DoubleDagger,
  ED25519PublicKey,
  EG_Extrinsic,
  G_Star,
  GuarantorsAssignment,
  Hash,
  HeaderLookupHistory,
  IDisputesState,
  JamState,
  Posterior,
  RHO,
  RecentHistory,
  Tau,
  Validated,
  WorkPackageHash,
  u32,
} from "@tsjam/types";
import {
  CORES,
  JAM_GUARANTEE,
  MAX_WORK_PREREQUISITES,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
  MAX_WORKREPORT_OUTPUT_SIZE,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  EPOCH_LENGTH,
} from "@tsjam/constants";
import { WorkReportCodec, encodeWithCodec } from "@tsjam/codec";
import { Ed25519, Hashing } from "@tsjam/crypto";
import { PHI_FN, _w } from "@tsjam/transitions";
import { Result, err, ok } from "neverthrow";
import { FisherYatesH } from "./fisherYates";
import { MMRSuperPeak } from "@tsjam/merklization";

export enum EGError {
  GAS_TOO_LOW = "Work result gasPrioritization is too low",
  GAS_EXCEEDED_ACCUMULATION_LIMITS = "Gas exceeded maximum accumulation limit GA",
  WORKREPORT_SIZE_EXCEEDED = "Workreport max size exceeded",
  MISSING_AUTH = "Missing authorization in pool",
  TOO_MANY_PREREQUISITES = "Too many work prerequisites in report",
  ANCHOR_NOT_IN_RECENTHISTORY = "Anchor not in recent history",
  EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES = "Extrinsic length must be less than CORES",
  CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "core index must be unique and ordered",
  CORE_INDEX_NOT_IN_BOUNDS = "core index not in bounds",
  CREDS_MUST_BE_BETWEEN_2_AND_3 = "credential length must be between 2 and 3",
  VALIDATOR_INDEX_MUST_BE_IN_BOUNDS = "validator index must be 0 <= x < V",
  VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "validator index must be unique and ordered",
  SIGNATURE_INVALID = "EG signature is invalid",
  CORE_INDEX_MISMATCH = "Core index mismatch",
  TIMESLOT_BOUNDS_1 = "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t",
  TIMESLOT_BOUNDS_2 = "Time slot must be within bounds, t <= tau'",
  WORK_PACKAGE_HASH_NOT_UNIQUE = "Work package hash must be unique",
  WORKPACKAGE_IN_PIPELINE = "Work Package alredy known",
  SRLWP_NOTKNOWN = "Reported Segment Root lookup not known",
  LOOKUP_ANCHOR_NOT_WITHIN_L = "Lookup anchor block must be within L timeslots",
  REPORT_PENDING_AVAILABILITY = "Bit may be set if the corresponding core has a report pending availability",
  LOOKUP_ANCHOR_TIMESLOT_MISMATCH = "Lookup anchor timeslot mismatch",
  WRONG_CODEHASH = "Wrong codehash",
}
/**
 * $(0.6.4 - 11.26) | calculates R in it
 */
export const garantorsReporters = (input: {
  extrinsic: EG_Extrinsic;
  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_tau: Posterior<Tau>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
  p_entropy: Posterior<JamState["entropy"]>;
}) => {
  const g_star = G_STAR_fn({
    p_eta2: toPosterior(input.p_entropy[2]),
    p_eta3: toPosterior(input.p_entropy[3]),
    p_kappa: input.p_kappa,
    p_lambda: input.p_lambda,
    p_psi_o: input.p_psi_o,
    p_tau: input.p_tau,
  });

  const g = G_fn({
    entropy: input.p_entropy[2],
    p_tau: input.p_tau,
    tauOffset: 0 as u32,
    validatorKeys: input.p_kappa,
    p_psi_o: input.p_psi_o,
  });

  const reporters = new Set<ED25519PublicKey>();
  const curRotation = Math.floor(input.p_tau / VALIDATOR_CORE_ROTATION);
  for (const { credential, timeSlot } of input.extrinsic) {
    let usedG: GuarantorsAssignment = g_star;
    if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
      usedG = g;
    }
    for (const { validatorIndex } of credential) {
      reporters.add(usedG.validatorsED22519Key[validatorIndex]);
    }
  }
  return reporters;
};

export const assertEGValid = (
  extrinsic: EG_Extrinsic,
  deps: {
    headerLookupHistory: HeaderLookupHistory;
    recentHistory: RecentHistory;
    d_recentHistory: Dagger<RecentHistory>;
    delta: Delta;
    accumulationHistory: AccumulationHistory;
    accumulationQueue: AccumulationQueue;
    authPool: AuthorizerPool;
    rho: RHO;
    dd_rho: DoubleDagger<RHO>;
    p_entropy: Posterior<JamState["entropy"]>;
    p_kappa: Posterior<JamState["kappa"]>;
    p_lambda: Posterior<JamState["lambda"]>;
    p_tau: Posterior<Tau>;
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
  },
): Result<Validated<EG_Extrinsic>, EGError> => {
  if (extrinsic.length === 0) {
    return ok(extrinsic as Validated<EG_Extrinsic>); // optimization
  }
  // $(0.6.4 - 11.23)
  if (extrinsic.length > CORES) {
    return err(EGError.EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES);
  }

  for (const { workReport } of extrinsic) {
    // $(0.6.4 - 11.3) | Check the number of dependencies in the workreports
    if (
      workReport.segmentRootLookup.size +
        workReport.refinementContext.dependencies.length >
      MAX_WORK_PREREQUISITES
    ) {
      return err(EGError.TOO_MANY_PREREQUISITES);
    }

    // $(0.6.4 - 11.8) | check work report total size
    const totalSize =
      workReport.authorizerOutput.length +
      workReport.results
        .map((r) => r.output)
        .filter((ro) => ro instanceof Uint8Array)
        .map((ro) => ro.length)
        .reduce((a, b) => a + b, 0);
    if (totalSize > MAX_WORKREPORT_OUTPUT_SIZE) {
      return err(EGError.WORKREPORT_SIZE_EXCEEDED);
    }
  }

  // $(0.6.4 - 11.24) - make sure they're ordered and uniqueby coreindex
  for (let i = 1; i < extrinsic.length; i++) {
    const [prev, next] = [extrinsic[i - 1], extrinsic[i]];
    if (prev.workReport.coreIndex >= next.workReport.coreIndex) {
      return err(EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
    }
    if (next.workReport.coreIndex >= CORES || next.workReport.coreIndex < 0) {
      return err(EGError.CORE_INDEX_NOT_IN_BOUNDS);
    }
  }

  for (const { credential } of extrinsic) {
    // $(0.6.4 - 11.23)
    if (credential.length < 2 || credential.length > 3) {
      return err(EGError.CREDS_MUST_BE_BETWEEN_2_AND_3);
    }
    // $(0.6.4 - 11.25) | creds must be ordered by their val idx
    for (let i = 1; i < credential.length; i++) {
      const [prev, next] = [credential[i - 1], credential[i]];
      if (prev.validatorIndex >= next.validatorIndex) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
      }
    }
  }

  const g_star = G_STAR_fn({
    p_eta2: toPosterior(deps.p_entropy[2]),
    p_eta3: toPosterior(deps.p_entropy[3]),
    p_kappa: deps.p_kappa,
    p_lambda: deps.p_lambda,
    p_psi_o: deps.p_psi_o,
    p_tau: deps.p_tau,
  });

  const g = G_fn({
    entropy: deps.p_entropy[2],
    p_tau: deps.p_tau,
    tauOffset: 0 as u32,
    validatorKeys: deps.p_kappa,
    p_psi_o: deps.p_psi_o,
  });

  // $(0.6.4 - 11.26)
  const curRotation = Math.floor(deps.p_tau / VALIDATOR_CORE_ROTATION);

  for (const { workReport, timeSlot, credential } of extrinsic) {
    const wrh = Hashing.blake2bBuf(
      encodeWithCodec(WorkReportCodec, workReport),
    );
    const messageToSign = new Uint8Array([...JAM_GUARANTEE, ...wrh]);

    for (const { validatorIndex, signature } of credential) {
      // $(0.6.4 - 11.23) | should be Nv
      if (validatorIndex < 0 || validatorIndex >= NUMBER_OF_VALIDATORS) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS);
      }
      let correspondingG: GuarantorsAssignment = g_star;
      if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
        correspondingG = g;
      }

      if (
        workReport.coreIndex !==
        correspondingG.validatorsAssignedCore[validatorIndex]
      ) {
        return err(EGError.CORE_INDEX_MISMATCH);
      }
      // And
      if (VALIDATOR_CORE_ROTATION * (curRotation - 1) > timeSlot) {
        return err(EGError.TIMESLOT_BOUNDS_1);
      }
      if (timeSlot > deps.p_tau) {
        return err(EGError.TIMESLOT_BOUNDS_2);
      }

      // $(0.6.4 - 11.26)
      const isValid = Ed25519.verifySignature(
        signature,
        correspondingG.validatorsED22519Key[validatorIndex],
        messageToSign,
      );
      if (!isValid) {
        return err(EGError.SIGNATURE_INVALID);
      }
    }
  }

  // $(0.6.4 - 11.28)
  const w = _w(extrinsic);

  // $(0.6.4 - 11.29) | no reports on core with pending avail
  for (let i = 0; i < w.length; i++) {
    const { coreIndex, authorizerHash } = w[i];
    if (typeof deps.dd_rho[coreIndex] !== "undefined") {
      return err(EGError.REPORT_PENDING_AVAILABILITY);
    }
    const poolHashes = new Set(deps.authPool[coreIndex]);
    if (!poolHashes.has(authorizerHash)) {
      return err(EGError.MISSING_AUTH);
    }
  }

  // $(0.6.4 - 11.42) | check the result serviceIndex & codeHash match what we have in delta
  for (const _w of w) {
    for (const r of _w.results) {
      if (r.codeHash !== deps.delta.get(r.serviceIndex)?.codeHash) {
        return err(EGError.WRONG_CODEHASH);
      }
    }
  }

  // $(0.6.4 - 11.30) | check gas requiremens
  for (const wr of w) {
    const usedGas = wr.results
      .map((r) => r.gasPrioritization)
      .reduce((a, b) => a + b, 0n);
    if (usedGas > TOTAL_GAS_ACCUMULATION_LOGIC) {
      return err(EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS);
    }

    for (const res of wr.results) {
      if (
        res.gasPrioritization <
        deps.delta.get(res.serviceIndex)!.minGasAccumulate
      ) {
        return err(EGError.GAS_TOO_LOW);
      }
    }
  }

  // $(0.6.4 - 11.31)
  const x = w.map(({ refinementContext }) => refinementContext);
  const p = w.map(
    ({ workPackageSpecification }) => workPackageSpecification.workPackageHash,
  );

  // $(0.6.4 - 11.32)
  if (p.length !== new Set(p).size) {
    return err(EGError.WORK_PACKAGE_HASH_NOT_UNIQUE);
  }

  const d_recentWithBeefy = deps.d_recentHistory.map((r) => ({
    ...r,
    beefyRoot: MMRSuperPeak(r.accumulationResultMMR) as BeefyRootHash,
  }));
  for (const refinementContext of x) {
    // $(0.6.4 - 11.33)
    const y = d_recentWithBeefy.find(
      (_y) =>
        _y.headerHash === refinementContext.anchor.hash &&
        _y.stateRoot === refinementContext.anchor.stateRoot &&
        _y.beefyRoot === refinementContext.anchor.beefyRoot,
    );
    if (typeof y === "undefined") {
      return err(EGError.ANCHOR_NOT_IN_RECENTHISTORY);
    }

    // $(0.6.4 - 11.34) each lookup anchor block within `L` timeslot
    if (
      refinementContext.lookupAnchor.timeSlot <
      deps.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR
    ) {
      return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
    }

    // $(0.6.4 - 11.35)
    const lookupHeader = deps.headerLookupHistory.get(
      refinementContext.lookupAnchor.timeSlot,
    );
    if (typeof lookupHeader === "undefined") {
      return err(EGError.LOOKUP_ANCHOR_TIMESLOT_MISMATCH);
    }
    if (lookupHeader.hash !== refinementContext.lookupAnchor.hash) {
      return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
    }
  }

  // $(0.6.4 - 11.36)
  const q: Set<WorkPackageHash> = new Set(
    deps.accumulationQueue
      .flat()
      .map((a) => a.workReport.refinementContext.dependencies)
      .flat(),
  );

  // $(0.6.4 - 11.37)
  const a: Set<WorkPackageHash> = new Set(
    deps.rho
      .map((a) => a?.workReport.refinementContext.dependencies)
      .flat()
      .filter((a) => typeof a !== "undefined"),
  );

  const kxp = new Set(
    deps.recentHistory.map((r) => [...r.reportedPackages.keys()]).flat(),
  );
  const _x = new Set(
    deps.accumulationHistory.map((a) => [...a.values()]).flat(),
  );
  // $(0.6.4 - 11.38)
  for (const _p of p) {
    if (q.has(_p) || a.has(_p) || kxp.has(_p) || _x.has(_p)) {
      return err(EGError.WORKPACKAGE_IN_PIPELINE);
    }
  }

  // $(0.6.4 - 11.39)
  const pSet = new Set(p);
  deps.recentHistory
    .map((r) => [...r.reportedPackages.keys()])
    .flat()
    .forEach((reportedHash) => pSet.add(reportedHash));

  for (const _w of w) {
    const _p = new Set([..._w.segmentRootLookup.keys()]);
    _w.refinementContext.dependencies.forEach((rwp) => _p.add(rwp));
    for (const _pp of _p.values()) {
      if (!pSet.has(_pp)) {
        return err(EGError.SRLWP_NOTKNOWN);
      }
    }
  }

  {
    // $(0.6.4 - 11.40)
    const p = new Map(
      extrinsic
        .map((e) => e.workReport.workPackageSpecification)
        .map((wPSpec) => [wPSpec.workPackageHash, wPSpec.segmentRoot]),
    );

    // $(0.6.4 - 11.41)
    const recentAndCurrentWP = new Map(
      deps.recentHistory
        .map((rh) => [...rh.reportedPackages.entries()])
        .flat()
        .concat([...p.entries()]),
    );
    for (const _w of w) {
      for (const [wph, h] of _w.segmentRootLookup) {
        const entry = recentAndCurrentWP.get(wph);
        if (typeof entry === "undefined" || entry !== h) {
          return err(EGError.SRLWP_NOTKNOWN);
        }
      }
    }
  }

  return ok(extrinsic as Validated<EG_Extrinsic>);
};

/**
 * $(0.6.4 - 11.19 / 11.20 / 11.21)
 */
const G_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Posterior<Tau>;
  validatorKeys: Posterior<JamState["kappa"] | JamState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number) => c.map((x) => (x + n) % CORES);
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: Tau) => {
    return R(
      FisherYatesH(
        Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) =>
          Math.floor((CORES * i) / NUMBER_OF_VALIDATORS),
        ),
        e,
      ),
      Math.floor((t % EPOCH_LENGTH) / VALIDATOR_CORE_ROTATION),
    );
  };
  return {
    // c
    validatorsAssignedCore: P(
      input.entropy,
      (input.p_tau + input.tauOffset) as Tau,
    ),
    // k
    validatorsED22519Key: PHI_FN(input.validatorKeys, input.p_psi_o).map(
      (v) => v.ed25519,
    ),
  } as GuarantorsAssignment;
};

/**
 * $(0.6.4 - 11.22)
 */
export const G_STAR_fn = (input: {
  p_eta2: Posterior<JamState["entropy"][2]>;
  p_eta3: Posterior<JamState["entropy"][3]>;
  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
  p_tau: Posterior<Tau>;
}) => {
  if (
    epochIndex((input.p_tau - VALIDATOR_CORE_ROTATION) as Tau) ==
    epochIndex(input.p_tau)
  ) {
    return G_fn({
      entropy: input.p_eta2,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  } else {
    return G_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  }
};
