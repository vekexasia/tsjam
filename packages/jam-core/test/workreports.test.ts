import fs from "fs";
import {
  AuthorizerPoolCodec,
  Blake2bHashCodec,
  codec_Eg,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub,
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
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Hash,
  AuthorizerPool,
  DoubleDagger,
  ED25519PublicKey,
  EG_Extrinsic,
  Gas,
  JamState,
  OpaqueHash,
  Posterior,
  RecentHistory,
  RecentHistoryItem,
  RHO,
  ServiceIndex,
  Tau,
  u32,
  u64,
  WorkPackageHash,
  AccumulationHistory,
  AccumulationQueue,
  HeaderLookupHistory,
  ServiceAccount,
  Delta,
  JamHeader,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { expect, vi, it, describe, beforeEach } from "vitest";
import { mapCodec } from "@tsjam/codec";
import { logCodec } from "@tsjam/codec/test/utils.js";
import { assertEGValid, EGError } from "@/validateEG";

const mocks = vi.hoisted(() => {
  return {
    CORES: 341,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
    VALIDATOR_CORE_ROTATION: 10,
  };
});
vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };

  Object.defineProperty(toRet, "VALIDATOR_CORE_ROTATION", {
    get() {
      return mocks.VALIDATOR_CORE_ROTATION;
    },
  });
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return mocks.NUMBER_OF_VALIDATORS;
    },
  });
  Object.defineProperty(toRet, "EPOCH_LENGTH", {
    get() {
      return mocks.EPOCH_LENGTH;
    },
  });
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  return toRet;
});

type TestState = {
  dd_rho: DoubleDagger<RHO>;

  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
  p_entropy: Posterior<JamState["entropy"]>;
  p_psi_o: ED25519PublicKey[];
  blockHistory: RecentHistory;
  authPool: AuthorizerPool;
  deltaServices: Array<{
    id: ServiceIndex;
    info: {
      codeHash: OpaqueHash;
      balance: u64;
      minItemGas: Gas;
      minMemoGas: Gas;
      bytes: u64;
      items: u32;
    };
  }>;
};
type Input = {
  eg: EG_Extrinsic;
  // H_t
  tau: Posterior<Tau>;
};
type Output = {
  reportedPackages: Array<{
    workPackageHash: WorkPackageHash;
    segmentTreeRoot: OpaqueHash;
  }>;
  reporters: Array<ED25519PublicKey>;
};
type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: Output; err?: number };
  postState: TestState;
};
const buildTest = (filename: string, size: "tiny" | "full") => {
  const NUMVALS = (size === "tiny"
    ? 6
    : 1023) as unknown as typeof NUMBER_OF_VALIDATORS;
  const EPLEN = (size === "tiny" ? 12 : 600) as unknown as typeof EPOCH_LENGTH;
  const NCOR = (size === "tiny" ? 2 : 341) as unknown as typeof CORES;
  const stateCodec = createCodec<TestState>([
    [
      "dd_rho",
      createSequenceCodec<DoubleDagger<RHO>>(
        NCOR,
        new Optional(
          createCodec<NonNullable<RHO[0]>>([
            ["workReport", WorkReportCodec],
            ["reportTime", E_sub_int<Tau>(4)],
          ]),
        ),
      ),
    ],
    [
      "p_kappa",
      createSequenceCodec<Posterior<JamState["kappa"]>>(
        NUMVALS,
        ValidatorDataCodec,
      ),
    ],
    [
      "p_lambda",
      createSequenceCodec<Posterior<JamState["lambda"]>>(
        NUMVALS,
        ValidatorDataCodec,
      ),
    ],
    [
      "p_entropy",
      createSequenceCodec(4, Blake2bHashCodec) as unknown as JamCodec<
        Posterior<JamState["entropy"]>
      >,
    ],
    [
      "p_psi_o",
      createArrayLengthDiscriminator<ED25519PublicKey[]>(Ed25519PubkeyCodec),
    ],
    [
      "blockHistory",
      createArrayLengthDiscriminator<RecentHistory>(
        createCodec([
          ["headerHash", HashCodec],
          [
            "accumulationResultMMR",
            createArrayLengthDiscriminator<
              RecentHistoryItem["accumulationResultMMR"]
            >(new Optional(HashCodec)),
          ],
          ["stateRoot", MerkleTreeRootCodec],
          [
            "reportedPackages",
            mapCodec(
              createArrayLengthDiscriminator(
                createCodec<{ hash: WorkPackageHash; root: Hash }>([
                  ["hash", WorkPackageHashCodec],
                  ["root", HashCodec],
                ]),
              ),
              (x) => new Map(x.map((y) => [y.hash, y.root])),
              (y) =>
                Array.from(y.entries()).map(([hash, root]) => ({ hash, root })),
            ),
          ],
        ]),
      ),
    ],
    ["authPool", AuthorizerPoolCodec()],
    [
      "deltaServices",
      createArrayLengthDiscriminator<TestState["deltaServices"]>(
        createCodec<TestState["deltaServices"][0]>([
          ["id", E_sub_int<ServiceIndex>(4)],
          [
            "info",
            createCodec<TestState["deltaServices"][0]["info"]>([
              ["codeHash", OpaqueHashCodec],
              ["balance", E_sub<u64>(8)],
              ["minItemGas", E_sub<Gas>(8)],
              ["minMemoGas", E_sub<Gas>(8)],
              ["bytes", E_sub<u64>(8)],
              ["items", E_sub_int<u32>(4)],
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
        return [id, { codeHash: info.codeHash } as unknown as ServiceAccount];
      }),
    ),
    p_tau: decoded.input.tau,
    p_kappa: decoded.preState.p_kappa,
    p_lambda: decoded.preState.p_lambda,
    p_entropy: decoded.preState.p_entropy,
    p_psi_o: toPosterior(new Set(decoded.preState.p_psi_o)),
    recentHistory: decoded.preState.blockHistory,

    // au: decoded.preState.authPool, //FIXME: authpool???
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
  const set = "tiny";
  beforeEach(() => {
    if (set === "tiny") {
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
  it.skip("dependency_missing-1", () => {
    expect(() => buildTest("dependency_missing-1", set)).toThrow(
      EGError.REPORT_PENDING_AVAILABILITY,
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
    expect(() => buildTest("too_high_work_report_gas-1", set)).toThrow("gaaas");
  });

  it("service_item_gas_too_low-1", () => {
    expect(() => buildTest("service_item_gas_too_low-1", set)).toThrow("gaaas");
  });

  it("many_dependencies-1", () => {
    buildTest("many_dependencies-1", set);
  });

  it("too_many_dependencies-1", () => {
    expect(() => buildTest("too_many_dependencies-1", set)).toThrow("deps");
  });
  it("no_enough_guarantees-1", () => {
    expect(() => buildTest("no_enough_guarantees-1", set)).toThrow(
      EGError.CREDS_MUST_BE_BETWEEN_2_AND_3,
    );
  });
  it("not_authorized-1", () => {
    expect(() => buildTest("not_authorized-1", set)).toThrow("authorizded");
  });
  it("not_authorized-2", () => {
    expect(() => buildTest("not_authorized-2", set)).toThrow("authorizded");
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
  it("segment_root_lookup_invalid-1", () => {
    buildTest("segment_root_lookup_invalid-1", set);
  })
  it("segment_root_lookup_invalid-2", () => {
    buildTest("segment_root_lookup_invalid-2", set);
  })
  it("wrong_assignment-1", () => {
    expect(() => buildTest("wrong_assignment-1", set)).toThrow("dc");
  });
  it("big_work_report_output-1", () => {
    buildTest("big_work_report_output-1", set);
  });

  it("too_big_work_report_output-1", () => {
    buildTest("too_big_work_report_output-1", set);
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
