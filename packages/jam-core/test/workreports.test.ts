import { AuthorizerPoolImpl } from "@/classes/AuthorizerPoolImpl";
import "@/classes/BetaImpl";
import { CoreStatisticsImpl } from "@/classes/CoreStatisticsImpl";
import {
  EGError,
  GuaranteesExtrinsicImpl,
} from "@/classes/extrinsics/guarantees";
import { JamEntropyImpl } from "@/classes/JamEntropyImpl";
import { KappaImpl } from "@/classes/KappaImpl";
import { LambdaImpl } from "@/classes/LambdaImpl";
import { RecentHistoryImpl } from "@/classes/RecentHistoryImpl";
import { RHOImpl } from "@/classes/RHOImpl";
import { ServicesStatisticsImpl } from "@/classes/ServicesStatisticsImpl";
import { SlotImpl } from "@/classes/SlotImpl";
import { HashCodec, xBytesCodec } from "@/codecs/miscCodecs";
import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  codec,
  E_sub_int,
  eSubBigIntCodec,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedCodec,
  MapJSONCodec,
  NumberJSONCodec,
  WrapJSONCodec,
} from "@tsjam/codec";
import {
  Balance,
  DoubleDagger,
  ED25519PublicKey,
  Gas,
  Hash,
  JamState,
  OpaqueHash,
  Posterior,
  ServiceIndex,
  Tau,
  u32,
  u64,
  WorkPackageHash,
} from "@tsjam/types";
import fs from "fs";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "./codec_utils";

@JamCodecable()
class ServiceInfo extends BaseJamCodecable {
  @codec(HashCodec, "code_hash")
  codeHash!: Hash; // a_c

  @eSubBigIntCodec(8, "balance")
  balance!: Balance; //a_b

  @eSubBigIntCodec(8, "min_item_gas")
  minItemGas!: Gas; //a_g
  @eSubBigIntCodec(8, "min_memo_gas")
  minMemoGas!: Gas; //a_m
  @eSubBigIntCodec(8, "bytes")
  bytes!: u64; //a_o (virtual)
  @eSubIntCodec(4, "items")
  items!: u32; //a_i (virtual)
  @codec(SlotImpl, "creation_slot")
  creationSlot!: SlotImpl;
  @codec(SlotImpl, "last_accumulation_slot")
  lastAccumulationSlot!: SlotImpl; // a_l
  @eSubIntCodec(4, "parent_service")
  parentServiceId!: ServiceIndex; // a_p
}

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(RHOImpl, "avail_assignments")
  dd_rho!: DoubleDagger<RHOImpl>;

  @codec(KappaImpl, "curr_validators")
  p_kappa!: Posterior<JamState["kappa"]>;

  @codec(LambdaImpl, "prev_validators")
  p_lambda!: Posterior<JamState["lambda"]>;

  @codec(JamEntropyImpl, "entropy")
  p_entropy!: Posterior<JamState["entropy"]>;

  @lengthDiscriminatedCodec(xBytesCodec(32), "offenders")
  p_psi_o!: ED25519PublicKey[];

  @jsonCodec(WrapJSONCodec("history", RecentHistoryImpl), "recent_blocks")
  @binaryCodec(RecentHistoryImpl)
  recentBlocks!: RecentHistoryImpl;

  @codec(AuthorizerPoolImpl, "auth_pools")
  authPool!: AuthorizerPoolImpl;

  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "data" },
      NumberJSONCodec(),
      WrapJSONCodec("service", ServiceInfo),
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(E_sub_int(4), ServiceInfo, (a, b) => a - b),
  )
  accounts!: Map<ServiceIndex, ServiceInfo>;

  @codec(CoreStatisticsImpl, "cores_statistics")
  coreStatistics!: CoreStatisticsImpl;

  @codec(ServicesStatisticsImpl, "services_statistics")
  servicesStatistics!: ServicesStatisticsImpl;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(GuaranteesExtrinsicImpl)
  guarantees!: GuaranteesExtrinsicImpl;
  @eSubIntCodec(4)
  slot!: Posterior<Tau>;

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
  @codec(HashCodec)
  workPackageHash!: WorkPackageHash;

  @codec(HashCodec)
  segmentTreeRoot!: OpaqueHash;
}
@JamCodecable()
class TestOuputOk extends BaseJamCodecable {
  @lengthDiscriminatedCodec(ReportedPackage)
  reported!: Array<ReportedPackage>;

  @lengthDiscriminatedCodec(xBytesCodec(32))
  reporters!: Array<ED25519PublicKey>;
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
    `${__dirname}/../../../jamtestvectors/stf/reports/tiny/${filename}.json`,
    "utf8",
  );

  const decoded = TestCase.fromJSON(JSON.parse(testBin));
  // console.log(decoded.preState.toJSON());
};
describe("workreports", () => {
  it("report_curr_rotation-1", () => {
    expect(() => buildTest("report_curr_rotation-1")).to.not.throw();
  });

  it.skip("report_prev_rotation-1", () => {
    expect(() => buildTest("report_prev_rotation-1")).to.not.throw();
  });

  it.skip("multiple_reports-1", () => {
    expect(() => buildTest("multiple_reports-1")).to.not.throw();
  });

  it.skip("anchor_not_recent-1", () => {
    expect(() => buildTest("anchor_not_recent-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it.skip("bad_beefy_mmr-1", () => {
    expect(() => buildTest("bad_beefy_mmr-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it.skip("bad_code_hash-1", () => {
    expect(() => buildTest("bad_code_hash-1")).toThrow(EGError.WRONG_CODEHASH);
  });

  it.skip("bad_core_index-1", () => {
    expect(() => buildTest("bad_core_index-1")).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it.skip("bad_service_id-1", () => {
    expect(() => buildTest("bad_service_id-1")).toThrow(EGError.WRONG_CODEHASH);
  });

  it.skip("bad_state_root-1", () => {
    expect(() => buildTest("bad_state_root-1")).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it.skip("bad_validator_index-1", () => {
    expect(() => buildTest("bad_validator_index-1")).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS,
    );
  });

  it.skip("core_engaged-1", () => {
    expect(() => buildTest("core_engaged-1")).toThrow(
      EGError.REPORT_PENDING_AVAILABILITY,
    );
  });

  it.skip("dependency_missing-1", () => {
    expect(() => buildTest("dependency_missing-1")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it.skip("duplicate_package_in_recent_history-1", () => {
    expect(() => buildTest("duplicate_package_in_recent_history-1")).toThrow(
      EGError.WORKPACKAGE_IN_PIPELINE,
    );
  });

  it.skip("future_report_slot-1", () => {
    expect(() => buildTest("future_report_slot-1")).toThrow(
      EGError.TIMESLOT_BOUNDS_2,
    );
  });

  it.skip("bad_signature-1", () => {
    expect(() => buildTest("bad_signature-1")).toThrow(
      EGError.SIGNATURE_INVALID,
    );
  });

  it.skip("high_work_report_gas-1", () => {
    buildTest("high_work_report_gas-1");
  });

  it.skip("too_high_work_report_gas-1", () => {
    expect(() => buildTest("too_high_work_report_gas-1")).toThrow(
      EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS,
    );
  });

  it.skip("service_item_gas_too_low-1", () => {
    expect(() => buildTest("service_item_gas_too_low-1")).toThrow(
      EGError.GAS_TOO_LOW,
    );
  });

  it.skip("many_dependencies-1", () => {
    buildTest("many_dependencies-1");
  });

  it.skip("too_many_dependencies-1", () => {
    expect(() => buildTest("too_many_dependencies-1")).toThrow(
      EGError.TOO_MANY_PREREQUISITES,
    );
  });

  it.skip("no_enough_guarantees-1", () => {
    expect(() => buildTest("no_enough_guarantees-1")).toThrow(
      EGError.CREDS_MUST_BE_BETWEEN_2_AND_3,
    );
  });

  it.skip("not_authorized-1", () => {
    expect(() => buildTest("not_authorized-1")).toThrow(EGError.MISSING_AUTH);
  });

  it.skip("not_authorized-2", () => {
    expect(() => buildTest("not_authorized-2")).toThrow(EGError.MISSING_AUTH);
  });

  it.skip("not_sorted_guarantor-1", () => {
    expect(() => buildTest("not_sorted_guarantor-1")).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it.skip("out_of_order_guarantees-1", () => {
    expect(() => buildTest("out_of_order_guarantees-1")).toThrow(
      EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it.skip("report_before_last_rotation-1", () => {
    expect(() => buildTest("report_before_last_rotation-1")).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it.skip("reports_with_dependencies-1", () => {
    buildTest("reports_with_dependencies-1");
  });

  it.skip("reports_with_dependencies-2", () => {
    buildTest("reports_with_dependencies-2");
  });

  it.skip("reports_with_dependencies-3", () => {
    buildTest("reports_with_dependencies-3");
  });

  it.skip("reports_with_dependencies-4", () => {
    buildTest("reports_with_dependencies-4");
  });

  it.skip("reports_with_dependencies-5", () => {
    buildTest("reports_with_dependencies-5");
  });

  it.skip("reports_with_dependencies-6", () => {
    buildTest("reports_with_dependencies-6");
  });

  it.skip("segment_root_lookup_invalid-1", () => {
    expect(() => buildTest("segment_root_lookup_invalid-1")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it.skip("segment_root_lookup_invalid-2", () => {
    expect(() => buildTest("segment_root_lookup_invalid-2")).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it.skip("wrong_assignment-1", () => {
    expect(() => buildTest("wrong_assignment-1")).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it.skip("big_work_report_output-1", () => {
    buildTest("big_work_report_output-1");
  });

  it.skip("too_big_work_report_output-1", () => {
    expect(() => buildTest("too_big_work_report_output-1")).toThrow(
      EGError.WORKREPORT_SIZE_EXCEEDED,
    );
  });
});
