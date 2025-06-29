import { WorkReportCodec, encodeWithCodec } from "@tsjam/codec";
import {
  CORES,
  EPOCH_LENGTH,
  JAM_GUARANTEE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  MAX_WORKREPORT_OUTPUT_SIZE,
  MAX_WORK_PREREQUISITES,
  NUMBER_OF_VALIDATORS,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  VALIDATOR_CORE_ROTATION,
} from "@tsjam/constants";
import { Ed25519, Hashing } from "@tsjam/crypto";
import { PHI_FN, _I } from "@tsjam/transitions";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerPool,
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
import { epochIndex, toPosterior } from "@tsjam/utils";
import { Result, err, ok } from "neverthrow";
import { FisherYatesH } from "./fisherYates";

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
 * $(0.7.0 - 11.26) | calculates bold G in it
 */
export const garantorsReporters = (input: {
  extrinsic: EG_Extrinsic;
  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_tau: Posterior<Tau>;
  p_offenders: Posterior<IDisputesState["offenders"]>;
  p_entropy: Posterior<JamState["entropy"]>;
}) => {
  const g_star = M_STAR_fn({
    p_eta2: toPosterior(input.p_entropy[2]),
    p_eta3: toPosterior(input.p_entropy[3]),
    p_kappa: input.p_kappa,
    p_lambda: input.p_lambda,
    p_offenders: input.p_offenders,
    p_tau: input.p_tau,
  });

  const g = M_fn({
    entropy: input.p_entropy[2],
    p_tau: input.p_tau,
    tauOffset: 0 as u32,
    validatorKeys: input.p_kappa,
    p_offenders: input.p_offenders,
  });

  const reporters = new Set<ED25519PublicKey["bigint"]>();
  const curRotation = Math.floor(input.p_tau / VALIDATOR_CORE_ROTATION);
  for (const { credential, timeSlot } of input.extrinsic) {
    let usedG: GuarantorsAssignment = g_star;
    if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
      usedG = g;
    }
    for (const { validatorIndex } of credential) {
      reporters.add(usedG.validatorsED22519Key[validatorIndex].bigint);
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
    p_offenders: Posterior<IDisputesState["offenders"]>;
  },
): Result<Validated<EG_Extrinsic>, EGError> => {
  if (extrinsic.length === 0) {
    return ok(extrinsic as Validated<EG_Extrinsic>); // optimization
  }
  // $(0.7.0 - 11.23)
  if (extrinsic.length > CORES) {
    return err(EGError.EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES);
  }

  for (const { workReport } of extrinsic) {
    // $(0.7.0 - 11.3) | Check the number of dependencies in the workreports
    if (
      workReport.srLookup.size + workReport.context.prerequisites.length >
      MAX_WORK_PREREQUISITES
    ) {
      return err(EGError.TOO_MANY_PREREQUISITES);
    }

    // $(0.7.0 - 11.8) | check work report total size
    const totalSize =
      workReport.authTrace.length +
      workReport.digests
        .map((r) => r.result)
        .filter((ro) => ro instanceof Uint8Array)
        .map((ro) => ro.length)
        .reduce((a, b) => a + b, 0);
    if (totalSize > MAX_WORKREPORT_OUTPUT_SIZE) {
      return err(EGError.WORKREPORT_SIZE_EXCEEDED);
    }
  }

  // $(0.7.0 - 11.24) - make sure they're ordered and uniqueby core
  for (let i = 1; i < extrinsic.length; i++) {
    const [prev, next] = [extrinsic[i - 1], extrinsic[i]];
    if (prev.workReport.core >= next.workReport.core) {
      return err(EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
    }
    if (next.workReport.core >= CORES || next.workReport.core < 0) {
      return err(EGError.CORE_INDEX_NOT_IN_BOUNDS);
    }
  }

  for (const { credential } of extrinsic) {
    // $(0.7.0 - 11.23)
    if (credential.length < 2 || credential.length > 3) {
      return err(EGError.CREDS_MUST_BE_BETWEEN_2_AND_3);
    }
    // $(0.7.0 - 11.25) | creds must be ordered by their val idx
    for (let i = 1; i < credential.length; i++) {
      const [prev, next] = [credential[i - 1], credential[i]];
      if (prev.validatorIndex >= next.validatorIndex) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
      }
    }
  }

  const g_star = M_STAR_fn({
    p_eta2: toPosterior(deps.p_entropy[2]),
    p_eta3: toPosterior(deps.p_entropy[3]),
    p_kappa: deps.p_kappa,
    p_lambda: deps.p_lambda,
    p_offenders: deps.p_offenders,
    p_tau: deps.p_tau,
  });

  const g = M_fn({
    entropy: deps.p_entropy[2],
    p_tau: deps.p_tau,
    tauOffset: 0 as u32,
    validatorKeys: deps.p_kappa,
    p_offenders: deps.p_offenders,
  });

  // $(0.7.0 - 11.26)
  const curRotation = Math.floor(deps.p_tau / VALIDATOR_CORE_ROTATION);

  for (const { workReport, timeSlot, credential } of extrinsic) {
    const wrh = Hashing.blake2bBuf(
      encodeWithCodec(WorkReportCodec, workReport),
    );
    const messageToSign = new Uint8Array([...JAM_GUARANTEE, ...wrh]);

    for (const { validatorIndex, signature } of credential) {
      // $(0.7.0 - 11.23) | should be Nv
      if (validatorIndex < 0 || validatorIndex >= NUMBER_OF_VALIDATORS) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS);
      }
      let correspondingG: GuarantorsAssignment = g_star;
      if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
        correspondingG = g;
      }

      if (
        workReport.core !==
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

      // $(0.7.0 - 11.26)
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

  // $(0.7.0 - 11.28)
  const bold_I = _I(extrinsic);

  // $(0.7.0 - 11.29) | no reports on core with pending avail
  for (let i = 0; i < bold_I.length; i++) {
    const { core, authorizer } = bold_I[i];
    if (typeof deps.dd_rho[core] !== "undefined") {
      return err(EGError.REPORT_PENDING_AVAILABILITY);
    }
    const poolHashes = new Set(deps.authPool[core]);
    if (!poolHashes.has(authorizer)) {
      return err(EGError.MISSING_AUTH);
    }
  }

  // $(0.7.0 - 11.30) | check gas requiremens
  for (const report of bold_I) {
    const gasUsed = report.digests
      .map((r) => r.gasLimit)
      .reduce((a, b) => a + b, 0n);
    if (gasUsed > TOTAL_GAS_ACCUMULATION_LOGIC) {
      return err(EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS);
    }

    for (const res of report.digests) {
      if (res.gasLimit < deps.delta.get(res.serviceIndex)!.minAccGas) {
        return err(EGError.GAS_TOO_LOW);
      }
    }
  }

  // $(0.7.0 - 11.31)
  const x = bold_I.map(({ context }) => context);
  const p = bold_I.map(({ avSpec }) => avSpec.packageHash);

  // $(0.7.0 - 11.32)
  if (p.length !== new Set(p).size) {
    return err(EGError.WORK_PACKAGE_HASH_NOT_UNIQUE);
  }

  for (const workContext of x) {
    // $(0.7.0 - 11.33)
    const y = deps.d_recentHistory.find(
      (_y) =>
        _y.headerHash === workContext.anchor.hash &&
        _y.stateRoot === workContext.anchor.postState &&
        _y.accumulationResultMMB === workContext.anchor.accOutLog,
    );
    if (typeof y === "undefined") {
      return err(EGError.ANCHOR_NOT_IN_RECENTHISTORY);
    }

    // $(0.7.0 - 11.34) each lookup anchor block within `L` timeslot
    if (
      workContext.lookupAnchor.time <
      deps.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR
    ) {
      return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
    }

    // $(0.7.0 - 11.35)
    const lookupHeader = deps.headerLookupHistory.get(
      workContext.lookupAnchor.time,
    );
    if (typeof lookupHeader === "undefined") {
      return err(EGError.LOOKUP_ANCHOR_TIMESLOT_MISMATCH);
    }
    if (lookupHeader.hash !== workContext.lookupAnchor.hash) {
      return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
    }
  }

  // $(0.7.0 - 11.36)
  const bold_q: Set<WorkPackageHash> = new Set(
    deps.accumulationQueue
      .flat()
      .map((a) => a.workReport.avSpec.packageHash)
      .flat(),
  );

  // $(0.7.0 - 11.37)
  const bold_a: Set<WorkPackageHash> = new Set(
    deps.rho
      .map((a) => a?.workReport.avSpec.packageHash)
      .flat()
      .filter((a) => typeof a !== "undefined"),
  );

  const kxp = new Set(
    deps.recentHistory.map((r) => [...r.reportedPackages.keys()]).flat(),
  );
  const _x = new Set(
    deps.accumulationHistory.map((a) => [...a.values()]).flat(),
  );
  // $(0.7.0 - 11.38)
  for (const _p of p) {
    if (bold_q.has(_p) || bold_a.has(_p) || kxp.has(_p) || _x.has(_p)) {
      return err(EGError.WORKPACKAGE_IN_PIPELINE);
    }
  }

  // $(0.7.0 - 11.39)
  const pSet = new Set(p);
  deps.recentHistory
    .map((r) => [...r.reportedPackages.keys()])
    .flat()
    .forEach((reportedHash) => pSet.add(reportedHash));

  for (const r of bold_I) {
    const _p = new Set([...r.srLookup.keys()]);
    r.context.prerequisites.forEach((rwp) => _p.add(rwp));
    for (const p of _p.values()) {
      if (!pSet.has(p)) {
        return err(EGError.SRLWP_NOTKNOWN);
      }
    }
  }

  {
    // $(0.7.0 - 11.40)
    const p = new Map(
      extrinsic
        .map((e) => e.workReport.avSpec)
        .map((wPSpec) => [wPSpec.packageHash, wPSpec.segmentRoot]),
    );

    // $(0.7.0 - 11.41)
    const recentAndCurrentWP = new Map(
      deps.recentHistory
        .map((rh) => [...rh.reportedPackages.entries()])
        .flat()
        .concat([...p.entries()]),
    );
    for (const bold_r of bold_I) {
      for (const [wph, h] of bold_r.srLookup) {
        const entry = recentAndCurrentWP.get(wph);
        if (typeof entry === "undefined" || entry !== h) {
          return err(EGError.SRLWP_NOTKNOWN);
        }
      }
    }
  }

  // $(0.7.0 - 11.42) | check the result serviceIndex & codeHash match what we have in delta
  for (const bold_r of bold_I) {
    for (const bold_d of bold_r.digests) {
      if (bold_d.codeHash !== deps.delta.get(bold_d.serviceIndex)?.codeHash) {
        return err(EGError.WRONG_CODEHASH);
      }
    }
  }

  return ok(extrinsic as Validated<EG_Extrinsic>);
};

/**
 * $(0.7.0 - 11.19 / 11.20 / 11.21)
 */
const M_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Posterior<Tau>;
  validatorKeys: Posterior<JamState["kappa"] | JamState["lambda"]>;
  p_offenders: Posterior<IDisputesState["offenders"]>;
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
    validatorsED22519Key: PHI_FN(input.validatorKeys, input.p_offenders).map(
      (v) => v.ed25519,
    ),
  } as GuarantorsAssignment;
};

/**
 * $(0.7.0 - 11.22)
 */
export const M_STAR_fn = (input: {
  p_eta2: Posterior<JamState["entropy"][2]>;
  p_eta3: Posterior<JamState["entropy"][3]>;
  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_offenders: Posterior<IDisputesState["offenders"]>;
  p_tau: Posterior<Tau>;
}) => {
  if (
    epochIndex((input.p_tau - VALIDATOR_CORE_ROTATION) as Tau) ==
    epochIndex(input.p_tau)
  ) {
    return M_fn({
      entropy: input.p_eta2,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_offenders: input.p_offenders,
    }) as G_Star;
  } else {
    return M_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_offenders: input.p_offenders,
    }) as G_Star;
  }
};
