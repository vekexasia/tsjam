import fs from "fs";
import {
  AuthorizerPoolCodec,
  Blake2bHashCodec,
  codec_Eg,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub_int,
  Ed25519PubkeyCodec,
  eitherOneOfCodec,
  HashCodec,
  JamCodec,
  MerkleTreeRootCodec,
  OpaqueHashCodec,
  Optional,
  ValidatorDataCodec,
  WorkPackageHashCodec,
  WorkReportCodec,
} from "@tsjam/codec";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Hash,
  AuthorizerPool,
  DoubleDagger,
  ED25519PublicKey,
  EG_Extrinsic,
  JamState,
  OpaqueHash,
  Posterior,
  RecentHistory,
  RecentHistoryItem,
  RHO,
  ServiceIndex,
  Tau,
  WorkPackageHash,
  AccumulationHistory,
  AccumulationQueue,
  ServiceAccount,
  Delta,
  JamHeader,
  Dagger,
  PrivilegedServices,
  WorkReport,
  MerkeTreeRoot,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { expect, vi, it, describe, beforeEach } from "vitest";
import { mapCodec } from "@tsjam/codec";
import { assertEGValid, EGError } from "@/validateEG";
import {
  serviceAccountFromTestServiceInfo,
  serviceInfoCodec,
  Test_ServiceInfo,
} from "./testCodecs";

type TestState = {
  slot: Tau;
  p_entropy_0: Posterior<JamState["entropy"][0]>;
  accQueue: AccumulationQueue;
  accHistory: AccumulationHistory;
  privServices: Posterior<PrivilegedServices>;
  accounts: {
    id: ServiceIndex;
    data: {
      service: Test_ServiceInfo;
      preimages: Array<{ hash: Hash; blob: Uint8Array }>;
    };
  };
};

type Input = {
  p_tau: Posterior<Tau>;
  reports: WorkReport[];
};

type Output = MerkeTreeRoot; // accumulate Root

type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: Output; err?: null };
  postState: TestState;
};

//
//
// TODO: use _i and _o from the testCOdec to provide the computed values of the serviseACcount
//
//

const buildTest = (filename: string) => {
  const stateCodec = createCodec<TestState>([
    ["slot", E_sub_int<Tau>(4)],
    ["p_entropy_0", E_sub_int<Posterior<JamState["entropy"][0]>>(4)],
    ["accQueue", createSeq],
    ["accHistory", createArrayLengthDiscriminator(WorkReportCodec)],
    ["privServices", E_sub_int<Posterior<PrivilegedServices>>(4)],
    [
      "accounts",
      createArrayLengthDiscriminator(
        createCodec([
          ["id", E_sub_int<ServiceIndex>(4)],
          [
            "data",
            createCodec([
              ["service", serviceInfoCodec],
              [
                "preimages",
                createArrayLengthDiscriminator(
                  createCodec([
                    ["hash", HashCodec],
                    ["blob", codec_Eg],
                  ]),
                ),
              ],
            ]),
          ],
        ]),
      ),
    ],
  ]);

  const testBin = fs.readFileSync(
    `${__dirname}/../../../jamtestvectors/reports/${size}/${filename}.bin`,
  );

  const decoded = createCodec<TestCase>([
    [
      "input",
      createCodec<Input>([
        ["eg", codec_Eg],
        ["tau", E_sub_int<Posterior<Tau>>(4)],
      ]),
    ],
    ["preState", stateCodec],
    [
      "output",
      eitherOneOfCodec<TestCase["output"]>([
        [
          "ok",
          createCodec<Output>([
            [
              "reportedPackages",
              createArrayLengthDiscriminator<Output["reportedPackages"]>(
                createCodec([
                  ["workPackageHash", WorkPackageHashCodec],
                  ["segmentTreeRoot", OpaqueHashCodec],
                ]),
              ),
            ],
            ["reporters", createArrayLengthDiscriminator(Ed25519PubkeyCodec)],
          ]),
        ],
        ["err", E_sub_int<number>(1)],
      ]),
    ],
    ["postState", stateCodec],
  ]).decode(testBin).value;

  const [err] = assertEGValid(decoded.input.eg, {
    rho: decoded.preState.dd_rho,
    dd_rho: decoded.preState.dd_rho,
    delta: <Delta>new Map<ServiceIndex, ServiceAccount>(
      decoded.preState.deltaServices.map(({ id, info }) => {
        return [id, serviceAccountFromTestServiceInfo(info)];
      }),
    ),
    p_tau: decoded.input.tau,
    p_kappa: decoded.preState.p_kappa,
    p_lambda: decoded.preState.p_lambda,
    p_entropy: decoded.preState.p_entropy,
    p_psi_o: toPosterior(new Set(decoded.preState.p_psi_o)),
    recentHistory: decoded.preState.blockHistory,
    d_recentHistory: decoded.preState.blockHistory as Dagger<RecentHistory>,
    authPool: decoded.preState.authPool,
    accumulationHistory: [] as unknown as AccumulationHistory,
    accumulationQueue: [] as unknown as AccumulationQueue,
    headerLookupHistory: new Map(
      decoded.input.eg.map((a) => {
        return [
          a.workReport.refinementContext.lookupAnchor.timeSlot as Tau,
          {
            hash: a.workReport.refinementContext.lookupAnchor.headerHash,
            header: null as unknown as JamHeader,
          },
        ];
      }),
    ),
  }).safeRet();

  if (err) {
    throw new Error(err);
  }
};
describe("workreports", () => {
  const set: "full" | "tiny" = "full";
  beforeEach(() => {
    if (set === <string>"tiny") {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
      mocks.EPOCH_LENGTH = 12;
      mocks.VALIDATOR_CORE_ROTATION = 4;
    }
  });

  it("report_curr_rotation-1", () => {
    expect(() => buildTest("report_curr_rotation-1", set)).to.not.throw();
  });

  it("report_prev_rotation-1", () => {
    expect(() => buildTest("report_prev_rotation-1", set)).to.not.throw();
  });

  it("multiple_reports-1", () => {
    expect(() => buildTest("multiple_reports-1", set)).to.not.throw();
  });

  it("anchor_not_recent-1", () => {
    expect(() => buildTest("anchor_not_recent-1", set)).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it("bad_code_hash-1", () => {
    expect(() => buildTest("bad_code_hash-1", set)).toThrow(
      EGError.WRONG_CODEHASH,
    );
  });

  it("bad_core_index-1", () => {
    expect(() => buildTest("bad_core_index-1", set)).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it("bad_service_id-1", () => {
    expect(() => buildTest("bad_service_id-1", set)).toThrow(
      EGError.WRONG_CODEHASH,
    );
  });

  it("bad_state_root-1", () => {
    expect(() => buildTest("bad_state_root-1", set)).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });

  it("bad_validator_index-1", () => {
    expect(() => buildTest("bad_validator_index-1", set)).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS,
    );
  });

  it("core_engaged-1", () => {
    expect(() => buildTest("core_engaged-1", set)).toThrow(
      EGError.REPORT_PENDING_AVAILABILITY,
    );
  });

  it("dependency_missing-1", () => {
    expect(() => buildTest("dependency_missing-1", set)).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("duplicate_package_in_recent_history-1", () => {
    expect(() =>
      buildTest("duplicate_package_in_recent_history-1", set),
    ).toThrow(EGError.WORKPACKAGE_IN_PIPELINE);
  });

  it("future_report_slot-1", () => {
    expect(() => buildTest("future_report_slot-1", set)).toThrow(
      EGError.TIMESLOT_BOUNDS_2,
    );
  });

  it("bad_signature-1", () => {
    expect(() => buildTest("bad_signature-1", set)).toThrow(
      EGError.SIGNATURE_INVALID,
    );
  });

  it("high_work_report_gas-1", () => {
    buildTest("high_work_report_gas-1", set);
  });

  it("too_high_work_report_gas-1", () => {
    expect(() => buildTest("too_high_work_report_gas-1", set)).toThrow(
      EGError.GAS_EXCEEDED_ACCUMULATION_LIMITS,
    );
  });

  it("service_item_gas_too_low-1", () => {
    expect(() => buildTest("service_item_gas_too_low-1", set)).toThrow(
      EGError.GAS_TOO_LOW,
    );
  });

  it("many_dependencies-1", () => {
    buildTest("many_dependencies-1", set);
  });

  it("too_many_dependencies-1", () => {
    expect(() => buildTest("too_many_dependencies-1", set)).toThrow(
      EGError.TOO_MANY_PREREQUISITES,
    );
  });

  it("no_enough_guarantees-1", () => {
    expect(() => buildTest("no_enough_guarantees-1", set)).toThrow(
      EGError.CREDS_MUST_BE_BETWEEN_2_AND_3,
    );
  });

  it("not_authorized-1", () => {
    expect(() => buildTest("not_authorized-1", set)).toThrow(
      EGError.MISSING_AUTH,
    );
  });

  it("not_authorized-2", () => {
    expect(() => buildTest("not_authorized-2", set)).toThrow(
      EGError.MISSING_AUTH,
    );
  });

  it("not_sorted_guarantor-1", () => {
    expect(() => buildTest("not_sorted_guarantor-1", set)).toThrow(
      EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it("out_of_order_guarantees-1", () => {
    expect(() => buildTest("out_of_order_guarantees-1", set)).toThrow(
      EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED,
    );
  });

  it("reports_with_dependencies-1", () => {
    buildTest("reports_with_dependencies-1", set);
  });

  it("reports_with_dependencies-2", () => {
    buildTest("reports_with_dependencies-2", set);
  });

  it("reports_with_dependencies-3", () => {
    buildTest("reports_with_dependencies-3", set);
  });

  it("reports_with_dependencies-4", () => {
    buildTest("reports_with_dependencies-4", set);
  });

  it("reports_with_dependencies-5", () => {
    buildTest("reports_with_dependencies-5", set);
  });

  it("reports_with_dependencies-6", () => {
    buildTest("reports_with_dependencies-6", set);
  });

  it("segment_root_lookup_invalid-1", () => {
    expect(() => buildTest("segment_root_lookup_invalid-1", set)).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("segment_root_lookup_invalid-2", () => {
    expect(() => buildTest("segment_root_lookup_invalid-2", set)).toThrow(
      EGError.SRLWP_NOTKNOWN,
    );
  });

  it("wrong_assignment-1", () => {
    expect(() => buildTest("wrong_assignment-1", set)).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it("big_work_report_output-1", () => {
    buildTest("big_work_report_output-1", set);
  });

  it("too_big_work_report_output-1", () => {
    expect(() => buildTest("too_big_work_report_output-1", set)).toThrow(
      EGError.WORKREPORT_SIZE_EXCEEDED,
    );
  });

  it("report_before_last_rotation-1", () => {
    expect(() => buildTest("report_before_last_rotation-1", set)).toThrow(
      EGError.CORE_INDEX_MISMATCH,
    );
  });

  it("bad_beefy_mmr-1", () => {
    expect(() => buildTest("bad_beefy_mmr-1", set)).toThrow(
      EGError.ANCHOR_NOT_IN_RECENTHISTORY,
    );
  });
});
