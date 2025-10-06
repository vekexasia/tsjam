import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet, identitySetCodec } from "@/data-structures/identity-set";
import { AuthorizerPoolImpl } from "@/impls/authorizer-pool-impl";
import "@/impls/beta-impl";
import { BetaImpl } from "@/impls/beta-impl";
import { CoreStatisticsImpl } from "@/impls/core-statistics-impl";
import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import {
  EGError,
  GuaranteesExtrinsicImpl,
} from "@/impls/extrinsics/guarantees";
import { JamEntropyImpl } from "@/impls/jam-entropy-impl";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { RecentHistoryImpl } from "@/impls/recent-history-impl";
import { RHOImpl } from "@/impls/rho-impl";
import { ServicesStatisticsImpl } from "@/impls/services-statistics-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import {
  AccumulationStatisticsImpl,
  AssurancesExtrinsicImpl,
  HeaderLookupHistoryImpl,
  PreimagesExtrinsicImpl,
} from "@/index";
import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  codec,
  E_sub_int,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedCodec,
  MapJSONCodec,
  NumberJSONCodec,
  WrapJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import type {
  Dagger,
  DoubleDagger,
  ED25519PublicKey,
  OpaqueHash,
  Posterior,
  ServiceIndex,
  Validated,
  WorkPackageHash,
} from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import fs from "fs";
import type { ConditionalExcept } from "type-fest";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "../codec-utils";
import { TestServiceInfo } from "../common";
import { dummyState } from "../dummy-utils";

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(RHOImpl, "avail_assignments")
  dd_rho!: DoubleDagger<RHOImpl>;

  @codec(KappaImpl, "curr_validators")
  p_kappa!: Posterior<JamStateImpl["kappa"]>;

  @codec(LambdaImpl, "prev_validators")
  p_lambda!: Posterior<JamStateImpl["lambda"]>;

  @codec(JamEntropyImpl, "entropy")
  p_entropy!: Posterior<JamStateImpl["entropy"]>;

  @codec(DisputesStateImpl.codecOf("offenders"), "offenders")
  p_psi_o!: IdentitySet<ED25519PublicKey>;

  @jsonCodec(WrapJSONCodec("history", RecentHistoryImpl), "recent_blocks")
  @binaryCodec(RecentHistoryImpl)
  recentBlocks!: RecentHistoryImpl;

  @codec(AuthorizerPoolImpl, "auth_pools")
  authPool!: AuthorizerPoolImpl;

  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "data" },
      NumberJSONCodec(),
      WrapJSONCodec("service", TestServiceInfo),
      (a, b) => a - b,
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(E_sub_int(4), TestServiceInfo, (a, b) => a - b),
  )
  accounts!: Map<ServiceIndex, TestServiceInfo>;

  @codec(CoreStatisticsImpl, "cores_statistics")
  coreStatistics!: CoreStatisticsImpl;

  @codec(ServicesStatisticsImpl, "services_statistics")
  servicesStatistics!: ServicesStatisticsImpl;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(GuaranteesExtrinsicImpl)
  guarantees!: GuaranteesExtrinsicImpl;
  @codec(SlotImpl)
  slot!: Validated<Posterior<TauImpl>>;

  /**
   * This is a derived sequence of all known packages
   * The  is constructed from all the recently reported WPs using recent_blocks (β),
   * accumulated reports (ξ), availability (ρ), and ready queue (φ).
   */
  @lengthDiscriminatedCodec(HashCodec, "known_packages")
  knownPackages!: Array<WorkPackageHash>;
}

@JamCodecable()
class ReportedPackage extends BaseJamCodecable {
  @codec(HashCodec, "work_package_hash")
  workPackageHash!: WorkPackageHash;

  @codec(HashCodec, "segment_tree_root")
  segmentTreeRoot!: OpaqueHash;
  constructor(config?: ConditionalExcept<ReportedPackage, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
@JamCodecable()
class TestOuputOk extends BaseJamCodecable {
  @lengthDiscriminatedCodec(ReportedPackage)
  reported!: Array<ReportedPackage>;

  @identitySetCodec(xBytesCodec(32), "reporters")
  reporters!: IdentitySet<ED25519PublicKey>;
}

@JamCodecable()
export class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;

  @codec(TestState, "pre_state")
  preState!: TestState;

  @codec(TestOutputCodec(TestOuputOk))
  output!: { err?: Error; ok?: TestOuputOk };

  @codec(TestState, "post_state")
  postState!: TestState;
}
const buildTest = (filename: string) => {
  const testBin = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/stf/reports/${getConstantsMode()}/${filename}.json`,
    "utf8",
  );

  const decoded = TestCase.fromJSON(JSON.parse(testBin));
  const sampleState = dummyState();
  sampleState.disputes.offenders = decoded.preState.p_psi_o;

  const headerLookupHistory = HeaderLookupHistoryImpl.newEmpty();
  // we need to mock in $(0.7.1 - 11.35)
  decoded.input.guarantees.elements.forEach((e) => {
    headerLookupHistory.elements.set(
      e.report.context.lookupAnchorSlot,
      e.report.context.lookupAnchorHash,
    );
  });

  [...decoded.preState.accounts.entries()].forEach(
    ([serviceIndex, serviceInfo]) => {
      sampleState.serviceAccounts.set(
        serviceIndex,
        serviceInfo.toServiceAccount(serviceIndex),
      );
    },
  );

  const res = decoded.input.guarantees.checkValidity({
    beta: new BetaImpl({
      recentHistory: decoded.preState.recentBlocks,
      beefyBelt: [],
    }),
    serviceAccounts: sampleState.serviceAccounts,
    headerLookupHistory,
    d_recentHistory: toDagger(decoded.preState.recentBlocks),
    rho: decoded.preState.dd_rho,
    dd_rho: decoded.preState.dd_rho,
    authPool: decoded.preState.authPool,
    accumulationQueue: sampleState.accumulationQueue,
    accumulationHistory: sampleState.accumulationHistory,
    p_kappa: decoded.preState.p_kappa,
    p_lambda: decoded.preState.p_lambda,
    p_eta2: toPosterior(decoded.preState.p_entropy._2),
    p_eta3: toPosterior(decoded.preState.p_entropy._3),
    p_tau: decoded.input.slot,
    p_offenders: toPosterior(sampleState.disputes.offenders),
  });

  if (res.isErr()) {
    throw new Error(res.error);
  }
  if (!decoded.output.ok) {
    throw new Error(
      `Test Case was not ok but we did validate it: ${decoded.output.err}`,
    );
  }

  const reporters = res.value.reporters({
    p_offenders: toPosterior(sampleState.disputes.offenders),
    p_tau: decoded.input.slot,
    p_eta2: toPosterior(decoded.preState.p_entropy._2),
    p_eta3: toPosterior(decoded.preState.p_entropy._3),
    p_kappa: decoded.preState.p_kappa,
    p_lambda: decoded.preState.p_lambda,
  });

  expect(TestOuputOk.codecOf("reporters").toJSON(reporters)).deep.eq(
    TestOuputOk.codecOf("reporters").toJSON(decoded.output.ok!.reporters),
  );

  const reports = res.value.workReports().map((r) => {
    return new ReportedPackage({
      segmentTreeRoot: <OpaqueHash>r.avSpec.segmentRoot,
      workPackageHash: r.avSpec.packageHash,
    });
  });

  expect(
    TestOuputOk.codecOf("reported").toJSON(
      reports.sort((a, b) => {
        const ab = Buffer.compare(a.workPackageHash, b.workPackageHash);
        if (ab === 0) {
          return Buffer.compare(a.segmentTreeRoot, b.segmentTreeRoot);
        }
        return ab;
      }),
    ),
  ).deep.eq(
    TestOuputOk.codecOf("reported").toJSON(decoded.output.ok!.reported),
  );

  const ea = <Validated<AssurancesExtrinsicImpl>>(
    AssurancesExtrinsicImpl.newEmpty()
  );
  const d_rho = decoded.preState.dd_rho as unknown as Dagger<RHOImpl>;
  const coreStats = sampleState.statistics.cores.toPosterior({
    ea,
    d_rho,
    bold_I: res.value.workReports(),
    bold_R: ea.newlyAvailableReports(d_rho),
  });
  expect(coreStats.toJSON()).deep.eq(decoded.postState.coreStatistics.toJSON());

  const servicesStats = sampleState.statistics.services.toPosterior({
    guaranteedReports: res.value.workReports(),
    ep: <Validated<PreimagesExtrinsicImpl>>PreimagesExtrinsicImpl.newEmpty(),
    accumulationStatistics: new AccumulationStatisticsImpl({
      elements: new Map(),
    }),
  });

  expect(servicesStats.toJSON()).deep.eq(
    decoded.postState.servicesStatistics.toJSON(),
  );
};
describe("workreports", () => {
  it("anchor_not_recent-1", () => {
    expect(() => buildTest("anchor_not_recent-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it("bad_beefy_mmr-1", () => {
    expect(() => buildTest("bad_beefy_mmr-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it("bad_code_hash-1", () => {
    expect(() => buildTest("bad_code_hash-1")).toThrow(EGError.WRONG_CODEHASH);
  });

  it("bad_core_index-1", () => {
    expect(() => buildTest("bad_core_index-1")).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it("bad_service_id-1", () => {
    expect(() => buildTest("bad_service_id-1")).toThrow(
      EGError.REPORT_NOT_IN_ACCOUNTS,
    );
  });

  it("bad_signature-1", () => {
    expect(() => buildTest("bad_signature-1")).toThrow(
      EGError.SIGNATURE_INVALID,
    );
  });

  it("bad_state_root-1", () => {
    expect(() => buildTest("bad_state_root-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it("bad_validator_index-1", () => {
    expect(() => buildTest("bad_validator_index-1")).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS,
    );
  });

  it("big_work_report_output-1", () => {
    buildTest("big_work_report_output-1");
  });

  it("core_engaged-1", () => {
    expect(() => buildTest("core_engaged-1")).toThrow(
      EGError.REPORT_PENDING_AVAILABILITY,
    );
  });

  it("dependency_missing-1", () => {
    expect(() => buildTest("dependency_missing-1")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("different_core_same_guarantors-1", () => {
    expect(() => buildTest("different_core_same_guarantors-1")).to.not.throw();
  });

  it("duplicate_package_in_recent_history-1", () => {
    expect(() => buildTest("duplicate_package_in_recent_history-1")).toThrow(
      EGError.WORKPACKAGE_IN_PIPELINE,
    );
  });

  it("duplicated_package_in_report-1", () => {
    expect(() => buildTest("duplicated_package_in_report-1")).toThrow(
      EGError.WORK_PACKAGE_HASH_NOT_UNIQUE,
    );
  });

  it("future_report_slot-1", () => {
    expect(() => buildTest("future_report_slot-1")).toThrow(
      EGError.TIMESLOT_BOUNDS_2,
    );
  });

  it("high_work_report_gas-1", () => {
    buildTest("high_work_report_gas-1");
  });

  it("many_dependencies-1", () => {
    buildTest("many_dependencies-1");
  });

  it("multiple_reports-1", () => {
    expect(() => buildTest("multiple_reports-1")).to.not.throw();
  });

  it("no_enough_guarantees-1", () => {
    expect(() => buildTest("no_enough_guarantees-1")).toThrow(
      EGError.CREDS_MUST_BE_BETWEEN_2_AND_3,
    );
  });

  it("not_authorized-1", () => {
    expect(() => buildTest("not_authorized-1")).toThrow(EGError.MISSING_AUTH);
  });

  it("not_authorized-2", () => {
    expect(() => buildTest("not_authorized-2")).toThrow(EGError.MISSING_AUTH);
  });

  it("not_sorted_guarantor-1", () => {
    expect(() => buildTest("not_sorted_guarantor-1")).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it("out_of_order_guarantees-1", () => {
    expect(() => buildTest("out_of_order_guarantees-1")).toThrow(
      EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it("report_before_last_rotation-1", () => {
    expect(() => buildTest("report_before_last_rotation-1")).toThrow(
      EGError.TIMESLOT_BOUNDS_1,
    );
  });

  it("report_curr_rotation-1", () => {
    buildTest("report_curr_rotation-1"); //.to.not.throw();
  });

  it("report_prev_rotation-1", () => {
    expect(() => buildTest("report_prev_rotation-1")).to.not.throw();
  });

  it("reports_with_dependencies-1", () => {
    buildTest("reports_with_dependencies-1");
  });

  it("reports_with_dependencies-2", () => {
    buildTest("reports_with_dependencies-2");
  });

  it("reports_with_dependencies-3", () => {
    buildTest("reports_with_dependencies-3");
  });

  it("reports_with_dependencies-4", () => {
    buildTest("reports_with_dependencies-4");
  });

  it("reports_with_dependencies-5", () => {
    buildTest("reports_with_dependencies-5");
  });

  it("reports_with_dependencies-6", () => {
    buildTest("reports_with_dependencies-6");
  });

  it("segment_root_lookup_invalid-1", () => {
    expect(() => buildTest("segment_root_lookup_invalid-1")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("segment_root_lookup_invalid-2", () => {
    expect(() => buildTest("segment_root_lookup_invalid-2")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("service_item_gas_too_low-1", () => {
    expect(() => buildTest("service_item_gas_too_low-1")).toThrow(
      EGError.GAS_TOO_LOW,
    );
  });

  it("too_big_work_report_output-1", () => {
    expect(() => buildTest("too_big_work_report_output-1")).toThrow(
      EGError.WORKREPORT_SIZE_EXCEEDED,
    );
  });

  it("too_high_work_report_gas-1", () => {
    expect(() => buildTest("too_high_work_report_gas-1")).toThrow(
      EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS,
    );
  });

  it("too_many_dependencies-1", () => {
    expect(() => buildTest("too_many_dependencies-1")).toThrow(
      EGError.TOO_MANY_PREREQUISITES,
    );
  });

  it("with_avail_assignments-1", () => {
    expect(() => buildTest("with_avail_assignments-1")).to.not.throw();
  });

  it("wrong_assignment-1", () => {
    expect(() => buildTest("wrong_assignment-1")).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });
});
