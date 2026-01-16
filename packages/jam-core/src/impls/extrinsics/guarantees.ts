import { IdentityMap } from "@/data-structures/identity-map";
import { IdentitySet } from "@/data-structures/identity-set";
import {
  BaseJamCodecable,
  codec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import {
  CORES,
  JAM_GUARANTEE,
  MAX_WORKREPORT_OUTPUT_SIZE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  NUMBER_OF_VALIDATORS,
  TOTAL_GAS_ACCUMULATION_LOGIC,
  VALIDATOR_CORE_ROTATION,
} from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import type {
  BoundedSeq,
  CoreIndex,
  Dagger,
  DoubleDagger,
  ED25519PublicKey,
  ED25519Signature,
  EG_Extrinsic,
  GuarantorsAssignment,
  Posterior,
  SingleWorkReportGuarantee,
  SingleWorkReportGuaranteeSignature,
  Tagged,
  Tau,
  UpToSeq,
  Validated,
  ValidatorIndex,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import type { AccumulationHistoryImpl } from "../accumulation-history-impl";
import type { AccumulationQueueImpl } from "../accumulation-queue-impl";
import type { AuthorizerPoolImpl } from "../authorizer-pool-impl";
import type { BetaImpl } from "../beta-impl";
import type { DeltaImpl } from "../delta-impl";
import type { DisputesStateImpl } from "../disputes-state-impl";
import { GuarantorsAssignmentImpl } from "../guarantors-assignment-impl";
import type { HeaderLookupHistoryImpl } from "../header-lookup-history-impl";
import type { JamEntropyImpl } from "../jam-entropy-impl";
import type { JamStateImpl } from "../jam-state-impl";
import type { RecentHistoryImpl } from "../recent-history-impl";
import type { RHOImpl } from "../rho-impl";
import { SlotImpl, type TauImpl } from "../slot-impl";
import { WorkReportImpl, WRError } from "../work-report-impl";

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
   * this is the time of which the validator started working on the
   * WorkPackage. It is used so that it uniquely identifies the guarantor
   * between M* and M
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
    const message = Buffer.allocUnsafe(JAM_GUARANTEE.length + 32);
    JAM_GUARANTEE.copy(message);
    this.report.hash().copy(message, JAM_GUARANTEE.length);
    return message;
  }

  checkValidity(deps: {
    M_STAR: Tagged<GuarantorsAssignmentImpl, "M*">;
    M: Tagged<GuarantorsAssignmentImpl, "M">;
    p_tau: Posterior<Tau>;
  }): Result<Validated<SingleWorkReportGuaranteeImpl>, EGError | WRError> {
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
      let guarantorAssignment: GuarantorsAssignmentImpl = deps.M_STAR;
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
    const [rErr] = this.report.checkValidity().safeRet();
    if (rErr) {
      return err(rErr);
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
  constructor(elements: SingleWorkReportGuaranteeImpl[] = []) {
    super();
    this.elements = toTagged(elements);
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
   * $(0.7.1 - 11.26) | calculates bold G in it
   * it can be used as well from assurers to get which reporters/guarantors to query
   * for their shard
   */
  reporters(deps: {
    p_eta2: Posterior<JamEntropyImpl["_2"]>;
    p_eta3: Posterior<JamEntropyImpl["_3"]>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  }) {
    const M_star = GuarantorsAssignmentImpl.prevRotation({
      p_eta2: deps.p_eta2,
      p_eta3: deps.p_eta3,
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
      p_offenders: deps.p_offenders,
      p_tau: deps.p_tau,
    });

    const M = GuarantorsAssignmentImpl.curRotation({
      p_eta2: deps.p_eta2,
      p_tau: deps.p_tau,
      p_offenders: deps.p_offenders,
      p_kappa: deps.p_kappa,
    });

    const reporters = new IdentitySet<ED25519PublicKey>();
    const curRotation = Math.floor(deps.p_tau.value / VALIDATOR_CORE_ROTATION);
    for (const { signatures, slot } of this.elements) {
      let usedG: GuarantorsAssignmentImpl = M_star;
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
    p_eta2: Posterior<JamEntropyImpl["_2"]>;
    p_eta3: Posterior<JamEntropyImpl["_3"]>;
    authPool: AuthorizerPoolImpl;
    serviceAccounts: DeltaImpl;
    headerLookupHistory: HeaderLookupHistoryImpl;
    accumulationHistory: AccumulationHistoryImpl;
    accumulationQueue: AccumulationQueueImpl;
    rho: RHOImpl;
    beta: BetaImpl;

    d_recentHistory: Dagger<RecentHistoryImpl>;
    dd_rho: DoubleDagger<RHOImpl>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  }): Result<Validated<GuaranteesExtrinsicImpl>, EGError | WRError> {
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

    const m_star = GuarantorsAssignmentImpl.prevRotation({
      p_tau: deps.p_tau,
      p_kappa: deps.p_kappa,
      p_eta2: deps.p_eta2,
      p_eta3: deps.p_eta3,
      p_lambda: deps.p_lambda,
      p_offenders: deps.p_offenders,
    });

    const m = GuarantorsAssignmentImpl.curRotation({
      p_eta2: deps.p_eta2,
      p_offenders: deps.p_offenders,
      p_tau: deps.p_tau,
      p_kappa: deps.p_kappa,
    });

    for (const element of this.elements) {
      const [e, _] = element
        .checkValidity({
          p_tau: deps.p_tau,
          M_STAR: m_star,
          M: m,
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

      if (process.env.RUNNING_TRACE_TESTS === "true") {
        // NOTE: we skip header history checks as they are not provided
        continue;
      }

      // $(0.7.1 - 11.35)
      const lookupHeaderHash = deps.headerLookupHistory.get(
        workContext.lookupAnchorSlot,
      );
      if (typeof lookupHeaderHash === "undefined") {
        return err(EGError.LOOKUP_ANCHOR_TIMESLOT_MISMATCH);
      }
      if (
        Buffer.compare(lookupHeaderHash, workContext.lookupAnchorHash) !== 0
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

    const _x = new IdentitySet(
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
      const _p = new IdentitySet([...r.srLookup.keys()]);
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
              Buffer.alloc(0),
          ) !== 0
        ) {
          return err(EGError.WRONG_CODEHASH);
        }
      }
    }

    return ok(toTagged(this));
  }

  static newEmpty(): GuaranteesExtrinsicImpl {
    return new GuaranteesExtrinsicImpl([]);
  }
}

export enum EGError {
  GAS_TOO_LOW = "Work result gasPrioritization is too low",
  GAS_EXCEEDED_ACCUMULATION_LIMITS = "Gas exceeded maximum accumulation limit GA",
  WORKREPORT_SIZE_EXCEEDED = "Workreport max size exceeded",
  MISSING_AUTH = "MISSING_AUTH",
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
