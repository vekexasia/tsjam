import { HashCodec } from "@/codecs/misc-codecs";
import { IdentityMap } from "@/data-structures/identity-map";
import { IdentitySet } from "@/data-structures/identity-set";
import { FisherYatesH } from "@/fisher-yates";
import {
  BaseJamCodecable,
  codec,
  encodeWithCodec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import {
  CORES,
  EPOCH_LENGTH,
  JAM_GUARANTEE,
  MAX_WORK_PREREQUISITES,
  MAX_WORKREPORT_OUTPUT_SIZE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  NUMBER_OF_VALIDATORS,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  VALIDATOR_CORE_ROTATION,
} from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import {
  BoundedSeq,
  CoreIndex,
  Dagger,
  DoubleDagger,
  ED25519PublicKey,
  ED25519Signature,
  EG_Extrinsic,
  GuarantorsAssignment,
  Hash,
  JamEntropy,
  Posterior,
  SingleWorkReportGuarantee,
  SingleWorkReportGuaranteeSignature,
  Tagged,
  Tau,
  u32,
  UpToSeq,
  Validated,
  ValidatorIndex,
  WorkPackageHash,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { AccumulationHistoryImpl } from "../accumulation-history-impl";
import { AccumulationQueueImpl } from "../accumulation-queue-impl";
import { AuthorizerPoolImpl } from "../authorizer-pool-impl";
import { BetaImpl } from "../beta-impl";
import { DeltaImpl } from "../delta-impl";
import { DisputesStateImpl } from "../disputes-state-impl";
import { HeaderLookupHistoryImpl } from "../header-lookup-history-impl";
import { JamEntropyImpl } from "../jam-entropy-impl";
import { JamStateImpl } from "../jam-state-impl";
import { RecentHistoryImpl } from "../recent-history-impl";
import { RHOImpl } from "../rho-impl";
import { SlotImpl, TauImpl } from "../slot-impl";
import { WorkReportImpl } from "../work-report-impl";

@JamCodecable()
export class SingleWorkReportGuaranteeSignatureImpl
  extends BaseJamCodecable
  implements SingleWorkReportGuaranteeSignature
{
  /**
   * `v`
   */
  @eSubIntCodec(2, "validator_index")
  validatorIndex!: ValidatorIndex;
  /**
   * `s`
   */
  @codec(xBytesCodec(64))
  signature!: ED25519Signature;

  checkValidity(deps: {
    guarantorAssignment: GuarantorsAssignment;
    messageToSign: Uint8Array;
    reportCore: CoreIndex;
  }): Result<Validated<SingleWorkReportGuaranteeSignatureImpl>, EGError> {
    // $(0.7.1 - 11.23) | should be Nv
    if (
      this.validatorIndex < 0 ||
      this.validatorIndex >= NUMBER_OF_VALIDATORS
    ) {
      return err(EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS);
    }
    // $(0.7.1 - 11.26)
    const isValid = Ed25519.verifySignature(
      this.signature,
      deps.guarantorAssignment.validatorsED22519Key[this.validatorIndex],
      deps.messageToSign,
    );
    if (!isValid) {
      return err(EGError.SIGNATURE_INVALID);
    }

    // c_v = r_c
    if (
      deps.guarantorAssignment.validatorsAssignedCore[this.validatorIndex] !==
      deps.reportCore
    ) {
      // validator was not assigned to the core in workreport
      return err(EGError.CORE_INDEX_MISMATCH);
    }

    return ok(toTagged(this));
  }
}

@JamCodecable()
export class SingleWorkReportGuaranteeImpl
  extends BaseJamCodecable
  implements SingleWorkReportGuarantee
{
  /**
   * `bold_r`
   * the `.core` of this workload must be unique within
   * the full extrinsic
   */
  @codec(WorkReportImpl)
  report!: WorkReportImpl;

  /**
   * `t`
   */
  @codec(SlotImpl)
  slot!: SlotImpl;

  /**
   * `a`
   * the creds must be ordered by `validatorIndex`
   *
   */
  @lengthDiscriminatedCodec(SingleWorkReportGuaranteeSignatureImpl)
  signatures!: BoundedSeq<SingleWorkReportGuaranteeSignatureImpl, 2, 3>;

  constructor(
    config?: Partial<
      ConditionalExcept<SingleWorkReportGuaranteeImpl, Function>
    >,
  ) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
  totalSize(): number {
    // $(0.7.1 - 11.8)
    return (
      this.report.authTrace.length +
      this.report.digests
        .map((r) => r.result)
        .filter((ro) => ro.isSuccess()) // check if binary in graypaper
        .map((ro) => ro.success!.length)
        .reduce((a, b) => a + b, 0)
    );
  }

  messageToSign(): Uint8Array {
    // $(0.7.1 - 11.26)
    return new Uint8Array([
      ...JAM_GUARANTEE,
      ...encodeWithCodec(HashCodec, this.report.hash()),
    ]);
  }

  checkValidity(deps: {
    M_STAR: GuarantorsAssignment;
    M: GuarantorsAssignment;
    p_tau: Posterior<Tau>;
  }): Result<Validated<SingleWorkReportGuaranteeImpl>, EGError> {
    // $(0.7.1 - 11.3) | Check the number of dependencies in the workreports
    if (
      this.report.srLookup.size + this.report.context.prerequisites.length >
      MAX_WORK_PREREQUISITES
    ) {
      return err(EGError.TOO_MANY_PREREQUISITES);
    }

    // $(0.7.1 - 11.8) | check work report total size
    if (this.totalSize() > MAX_WORKREPORT_OUTPUT_SIZE) {
      return err(EGError.WORKREPORT_SIZE_EXCEEDED);
    }

    // $(0.7.1 - 11.23)
    if (this.signatures.length < 2 || this.signatures.length > 3) {
      return err(EGError.CREDS_MUST_BE_BETWEEN_2_AND_3);
    }
    // $(0.7.1 - 11.25) | creds must be ordered by their val idx
    for (let i = 1; i < this.signatures.length; i++) {
      const [prev, next] = [this.signatures[i - 1], this.signatures[i]];
      if (prev.validatorIndex >= next.validatorIndex) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
      }
    }
    // tau'/R
    const curRotation = Math.floor(deps.p_tau.value / VALIDATOR_CORE_ROTATION);

    // And of $(0.7.1 - 11.26)
    if (VALIDATOR_CORE_ROTATION * (curRotation - 1) > this.slot.value) {
      return err(EGError.TIMESLOT_BOUNDS_1);
    }
    if (this.slot.value > deps.p_tau.value) {
      return err(EGError.TIMESLOT_BOUNDS_2);
    }

    // $(0.7.1 - 11.26)
    const messageToSign = this.messageToSign();
    for (const signature of this.signatures) {
      let guarantorAssignment = deps.M_STAR;
      if (
        curRotation === Math.floor(this.slot.value / VALIDATOR_CORE_ROTATION)
      ) {
        guarantorAssignment = deps.M;
      }
      const [sig_err, _] = signature
        .checkValidity({
          guarantorAssignment,
          reportCore: this.report.core,
          messageToSign,
        })
        .safeRet();
      if (typeof sig_err !== "undefined") {
        return err(sig_err);
      }
    }

    return ok(toTagged(this));
  }
}

/**
 * $(0.7.1 - C.19) | codec
 */
@JamCodecable()
export class GuaranteesExtrinsicImpl
  extends BaseJamCodecable
  implements EG_Extrinsic
{
  @lengthDiscriminatedCodec(SingleWorkReportGuaranteeImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<SingleWorkReportGuaranteeImpl, typeof CORES>;
  constructor(elements?: UpToSeq<SingleWorkReportGuaranteeImpl, typeof CORES>) {
    super();
    if (typeof elements !== "undefined") {
      this.elements = elements;
    } else {
      this.elements = toTagged([]);
    }
  }

  elementForCore(core: CoreIndex) {
    return this.elements.find((el) => el.report.core === core);
  }

  /**
   * calculates bold I
   * which contains a list of all work reports included in the extrinsic
   * $(0.7.1 - 11.28)
   */
  workReports(): Tagged<WorkReportImpl[], "bold I"> {
    return toTagged(this.elements.map((el) => el.report));
  }

  /**
   * $(0.7.1 - 11.22)
   */
  M_star(deps: {
    p_entropy: Posterior<JamEntropyImpl>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_disputes: Posterior<DisputesStateImpl>;
    p_tau: Validated<Posterior<TauImpl>>;
  }): GuarantorsAssignment {
    return M_STAR_fn({
      p_eta2: toPosterior(deps.p_entropy._2),
      p_eta3: toPosterior(deps.p_entropy._3),
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
      p_offenders: toPosterior(deps.p_disputes.offenders),
      p_tau: deps.p_tau,
    });
  }

  /**
   * $(0.7.1 - 11.19 / 11.20 / 11.21)
   */
  M(deps: {
    p_entropy: Posterior<JamEntropyImpl>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_disputes: Posterior<DisputesStateImpl>;
  }): GuarantorsAssignment {
    return M_fn({
      entropy: deps.p_entropy._2,
      p_tau: deps.p_tau,
      tauOffset: <u32>0,
      validatorKeys: deps.p_kappa,
      p_offenders: toPosterior(deps.p_disputes.offenders),
    });
  }

  /**
   * $(0.7.1 - 11.26) | calculates bold G in it
   */
  reporters(deps: {
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_disputes: Posterior<DisputesStateImpl>;
    p_entropy: Posterior<JamStateImpl["entropy"]>;
  }) {
    const M_star = this.M_star({
      p_entropy: deps.p_entropy,
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
      p_disputes: deps.p_disputes,
      p_tau: deps.p_tau,
    });

    const M = this.M({
      p_tau: deps.p_tau,
      p_disputes: deps.p_disputes,
      p_entropy: deps.p_entropy,
      p_kappa: deps.p_kappa,
    });

    const reporters = new IdentitySet<ED25519PublicKey>();
    const curRotation = Math.floor(deps.p_tau.value / VALIDATOR_CORE_ROTATION);
    for (const { signatures, slot } of this.elements) {
      let usedG = M_star;
      if (curRotation === Math.floor(slot.value / VALIDATOR_CORE_ROTATION)) {
        usedG = M;
      }
      for (const { validatorIndex } of signatures) {
        reporters.add(usedG.validatorsED22519Key[validatorIndex]);
      }
    }
    return reporters;
  }

  checkValidity(deps: {
    authPool: AuthorizerPoolImpl;
    serviceAccounts: DeltaImpl;
    headerLookupHistory: HeaderLookupHistoryImpl;
    accumulationHistory: AccumulationHistoryImpl;
    accumulationQueue: AccumulationQueueImpl;
    rho: RHOImpl;
    beta: BetaImpl;

    d_recentHistory: Dagger<RecentHistoryImpl>;
    dd_rho: DoubleDagger<RHOImpl>;
    p_entropy: Posterior<JamStateImpl["entropy"]>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_disputes: Posterior<DisputesStateImpl>;
  }): Result<Validated<GuaranteesExtrinsicImpl>, EGError> {
    if (this.elements.length === 0) {
      return ok(toTagged(this)); // optimization
    }
    // $(0.7.1 - 11.23)
    if (this.elements.length > CORES) {
      return err(EGError.EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES);
    }

    // $(0.7.1 - 11.24) - make sure they're ordered and uniqueby core
    for (let i = 1; i < this.elements.length; i++) {
      const [prev, next] = [this.elements[i - 1], this.elements[i]];
      if (prev.report.core >= next.report.core) {
        return err(EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
      }
      if (next.report.core >= CORES || next.report.core < 0) {
        return err(EGError.CORE_INDEX_NOT_IN_BOUNDS);
      }
    }

    for (const element of this.elements) {
      const [e, _] = element
        .checkValidity({
          p_tau: deps.p_tau,
          M_STAR: this.M_star({
            p_tau: deps.p_tau,
            p_kappa: deps.p_kappa,
            p_entropy: deps.p_entropy,
            p_lambda: deps.p_lambda,
            p_disputes: deps.p_disputes,
          }),
          M: this.M({
            p_disputes: deps.p_disputes,
            p_tau: deps.p_tau,
            p_entropy: deps.p_entropy,
            p_kappa: deps.p_kappa,
          }),
        })
        .safeRet();

      if (typeof e !== "undefined") {
        return err(e);
      }
    }

    const bold_I = this.workReports();

    // $(0.7.1 - 11.29) | no reports on core with pending avail
    for (let i = 0; i < bold_I.length; i++) {
      const { core, authorizerHash } = bold_I[i];
      if (typeof deps.dd_rho.elementAt(core) !== "undefined") {
        return err(EGError.REPORT_PENDING_AVAILABILITY);
      }
      const poolHashes = new IdentitySet(deps.authPool.elementAt(core));
      if (!poolHashes.has(authorizerHash)) {
        return err(EGError.MISSING_AUTH);
      }
    }

    // $(0.7.1 - 11.30) | check gas requiremens
    for (const report of bold_I) {
      const gasUsed = report.digests
        .map((r) => r.gasLimit)
        .reduce((a, b) => a + b, 0n);
      if (gasUsed > TOTAL_GAS_ACCUMULATION_LOGIC) {
        return err(EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS);
      }

      for (const bold_d of report.digests) {
        const acc = deps.serviceAccounts.get(bold_d.serviceIndex);
        if (typeof acc === "undefined") {
          return err(EGError.REPORT_NOT_IN_ACCOUNTS);
        }
        if (bold_d.gasLimit < acc.minAccGas) {
          return err(EGError.GAS_TOO_LOW);
        }
      }
    }

    // $(0.7.1 - 11.31)
    const bold_x = bold_I.map(({ context }) => context);
    const bold_p = bold_I.map(({ avSpec }) => avSpec.packageHash);

    // $(0.7.1 - 11.32)
    if (bold_p.length !== new IdentitySet(bold_p).size) {
      return err(EGError.WORK_PACKAGE_HASH_NOT_UNIQUE);
    }

    for (const workContext of bold_x) {
      // $(0.7.1 - 11.33)
      const y = deps.d_recentHistory.elements.find(
        (_y) =>
          Buffer.compare(_y.headerHash, workContext.anchorHash) === 0 &&
          Buffer.compare(_y.stateRoot, workContext.anchorPostState) === 0 &&
          Buffer.compare(
            _y.accumulationResultMMB,
            workContext.anchorAccOutLog,
          ) === 0,
      );
      if (typeof y === "undefined") {
        return err(EGError.ANCHOR_NOT_IN_RECENTHISTORY);
      }

      // $(0.7.1 - 11.34) each lookup anchor block within `L` timeslot
      if (
        workContext.lookupAnchorSlot.value <
        deps.p_tau.value - MAXIMUM_AGE_LOOKUP_ANCHOR
      ) {
        return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
      }

      // $(0.7.1 - 11.35)
      const lookupHeader = deps.headerLookupHistory.get(
        workContext.lookupAnchorSlot,
      );
      if (typeof lookupHeader === "undefined") {
        return err(EGError.LOOKUP_ANCHOR_TIMESLOT_MISMATCH);
      }
      if (
        Buffer.compare(
          lookupHeader.signedHash(),
          workContext.lookupAnchorHash,
        ) !== 0
      ) {
        return err(EGError.LOOKUP_HASH_MISMATCH);
      }
    }

    // $(0.7.1 - 11.36)
    const bold_q = new IdentitySet<WorkPackageHash>(
      deps.accumulationQueue.elements
        .flat()
        .map((a) => a.workReport.avSpec.packageHash)
        .flat(),
    );

    // $(0.7.1 - 11.37)
    const bold_a = new IdentitySet<WorkPackageHash>(
      deps.rho.elements
        .map((a) => a?.workReport.avSpec.packageHash)
        .flat()
        .filter((a) => typeof a !== "undefined"),
    );

    const kxp = deps.beta.recentHistory.allPackageHashes();

    const _x = new Set(
      deps.accumulationHistory.elements.map((a) => [...a.values()]).flat(),
    );
    // $(0.7.1 - 11.38)
    for (const p of bold_p) {
      if (bold_q.has(p) || bold_a.has(p) || kxp.has(p) || _x.has(p)) {
        return err(EGError.WORKPACKAGE_IN_PIPELINE);
      }
    }

    // $(0.7.1 - 11.39)
    const pSet = new IdentitySet(bold_p);
    kxp.forEach((reportedHash) => pSet.add(reportedHash));

    for (const r of bold_I) {
      const _p = new Set([...r.srLookup.keys()]);
      r.context.prerequisites.forEach((rcp) => _p.add(rcp));
      for (const p of _p.values()) {
        if (!pSet.has(p)) {
          return err(EGError.SRLWP_NOTKNOWN);
        }
      }
    }

    {
      // $(0.7.1 - 11.40)
      const bold_p = new IdentityMap(
        this.elements
          .map((e) => e.report.avSpec)
          .map((wPSpec) => [wPSpec.packageHash, wPSpec.segmentRoot]),
      );

      // $(0.7.1 - 11.41)
      const recentAndCurrentWP = new IdentityMap(
        deps.beta.recentHistory.elements
          .map((rh) => [...rh.reportedPackages.entries()])
          .flat()
          .concat([...bold_p.entries()]),
      );
      for (const bold_r of bold_I) {
        for (const [wph, h] of bold_r.srLookup) {
          const entry = recentAndCurrentWP.get(wph);
          if (typeof entry === "undefined" || Buffer.compare(entry, h) !== 0) {
            return err(EGError.SRLWP_NOTKNOWN);
          }
        }
      }
    }

    // $(0.7.1 - 11.42) | check the result serviceIndex & codeHash match what we have in delta
    for (const bold_r of bold_I) {
      for (const bold_d of bold_r.digests) {
        if (
          Buffer.compare(
            bold_d.codeHash,
            deps.serviceAccounts.get(bold_d.serviceIndex)?.codeHash ??
              new Uint8Array(),
          ) !== 0
        ) {
          return err(EGError.WRONG_CODEHASH);
        }
      }
    }

    return ok(toTagged(this));
  }
}

export enum EGError {
  GAS_TOO_LOW = "Work result gasPrioritization is too low",
  GAS_EXCEEDED_ACCUMULATION_LIMITS = "Gas exceeded maximum accumulation limit GA",
  WORKREPORT_SIZE_EXCEEDED = "Workreport max size exceeded",
  MISSING_AUTH = "MISSING_AUTH",
  TOO_MANY_PREREQUISITES = "Too many work prerequisites in report",
  ANCHOR_NOT_IN_RECENTHISTORY = "ANCHOR_NOT_IN_RECENTHISTORY",
  EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES = "Extrinsic length must be less than CORES",
  CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "core index must be unique and ordered",
  CORE_INDEX_NOT_IN_BOUNDS = "core index not in bounds",
  CREDS_MUST_BE_BETWEEN_2_AND_3 = "credential length must be between 2 and 3",
  VALIDATOR_INDEX_MUST_BE_IN_BOUNDS = "validator index must be 0 <= x < V",
  VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "validator index must be unique and ordered",
  SIGNATURE_INVALID = "EG signature is invalid",
  CORE_INDEX_MISMATCH = "CORE_INDEX_MISMATCH",
  TIMESLOT_BOUNDS_1 = "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t",
  TIMESLOT_BOUNDS_2 = "Time slot must be within bounds, t <= tau'",
  WORK_PACKAGE_HASH_NOT_UNIQUE = "WORK_PACKAGE_HASH_NOT_UNIQUE",
  WORKPACKAGE_IN_PIPELINE = "Work Package alredy known",
  SRLWP_NOTKNOWN = "Reported Segment Root lookup not known",
  LOOKUP_ANCHOR_NOT_WITHIN_L = "LOOKUP_ANCHOR_NOT_WITHIN_L",
  REPORT_PENDING_AVAILABILITY = "Bit may be set if the corresponding core has a report pending availability",
  LOOKUP_ANCHOR_TIMESLOT_MISMATCH = "LOOKUP_ANCHOR_TIMESLOT_MISMATCH",
  WRONG_CODEHASH = "WRONG_CODEHASH",
  LOOKUP_HASH_MISMATCH = "LOOKUP_HASH_MISMATCH",
  REPORT_NOT_IN_ACCOUNTS = "REPORT_NOT_IN_ACCOUNTS",
}

const M_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Validated<Posterior<TauImpl>>;
  validatorKeys: Posterior<JamStateImpl["kappa"] | JamStateImpl["lambda"]>;
  p_offenders: Posterior<DisputesStateImpl["offenders"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number) => c.map((x) => (x + n) % CORES);
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: TauImpl) => {
    return R(
      FisherYatesH(
        Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) =>
          Math.floor((CORES * i) / NUMBER_OF_VALIDATORS),
        ),
        e,
      ),
      Math.floor((t.value % EPOCH_LENGTH) / VALIDATOR_CORE_ROTATION),
    );
  };
  return {
    // c
    validatorsAssignedCore: P(
      input.entropy,
      toTagged(new SlotImpl(<u32>(input.p_tau.value + input.tauOffset))),
    ),
    // k
    validatorsED22519Key: input.validatorKeys
      .phi(input.p_offenders)
      .elements.map((v) => v.ed25519),
  } as GuarantorsAssignment;
};

const M_STAR_fn = (input: {
  p_eta2: Posterior<JamEntropy["_2"]>;
  p_eta3: Posterior<JamEntropy["_3"]>;
  p_kappa: Posterior<JamStateImpl["kappa"]>;
  p_lambda: Posterior<JamStateImpl["lambda"]>;
  p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  p_tau: Validated<Posterior<TauImpl>>;
}) => {
  if (
    new SlotImpl(
      <u32>(input.p_tau.value - VALIDATOR_CORE_ROTATION),
    ).epochIndex() == input.p_tau.epochIndex()
  ) {
    return M_fn({
      entropy: input.p_eta2,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_offenders: input.p_offenders,
    });
  } else {
    return M_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_offenders: input.p_offenders,
    });
  }
};
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("codecEG", () => {
    it("guarantees_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("guarantees_extrinsic.bin");
      const { value: eg } = GuaranteesExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("guarantees_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("guarantees_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const eg: GuaranteesExtrinsicImpl =
        GuaranteesExtrinsicImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
