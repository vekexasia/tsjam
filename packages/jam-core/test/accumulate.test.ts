import fs from "fs";
import {
  AccumulationHistoryCodec,
  AccumulationQueueCodec,
  Blake2bHashCodec,
  buildKeyValueCodec,
  createArrayLengthDiscriminator,
  createCodec,
  E_sub_int,
  eitherOneOfCodec,
  extendCodec,
  IdentityCodec,
  LengthDiscriminator,
  MerkleTreeRootCodec,
  PrivilegedServicesCodec,
  WorkReportCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  JamState,
  Posterior,
  ServiceIndex,
  Tau,
  AccumulationHistory,
  AccumulationQueue,
  ServiceAccount,
  Delta,
  PrivilegedServices,
  AvailableWorkReports,
  Hash,
  MerkleTreeRoot,
} from "@tsjam/types";
import { vi, it, describe, beforeEach, expect } from "vitest";
import {
  posteriorCodec,
  serviceAccountFromTestInfo,
  buildTestDeltaCodec,
} from "@tsjam/codec/test/testCodecs.js";
import { accumulateReports } from "@/accumulate.js";
import { dummyState } from "./utils";
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
  slot: Tau;
  p_eta_0: Posterior<JamState["entropy"][0]>;
  accQueue: AccumulationQueue;
  accHistory: AccumulationHistory;
  privServices: PrivilegedServices;
  accounts: Delta;
};

type Input = {
  p_tau: Posterior<Tau>;
  reports: AvailableWorkReports;
};

type Output = MerkleTreeRoot; // accumulate Root

type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: Output; err?: {} };
  postState: TestState;
};

//
//
// TODO: use _i and _o from the testCOdec to provide the computed values of the serviseACcount
//
//

const accumulateAccountCodec = extendCodec(
  serviceAccountFromTestInfo(),
  createCodec<Pick<ServiceAccount, "preimage_p">>([
    [
      "preimage_p",
      buildKeyValueCodec(
        new LengthDiscriminator({
          ...IdentityCodec,
          decode(bytes: Uint8Array, length: number) {
            return IdentityCodec.decode(bytes.subarray(0, length));
          },
        }),
      ),
    ],
  ]),
);

const buildTest = (filename: string, size: string) => {
  const NUMVALS = (size === "tiny"
    ? 6
    : 1023) as unknown as typeof NUMBER_OF_VALIDATORS;
  const EPLEN = (size === "tiny" ? 12 : 600) as unknown as typeof EPOCH_LENGTH;
  const NCOR = (size === "tiny" ? 2 : 341) as unknown as number;

  const stateCodec = createCodec<TestState>([
    ["slot", E_sub_int<Tau>(4)],
    ["p_eta_0", posteriorCodec(Blake2bHashCodec)],
    ["accQueue", AccumulationQueueCodec(EPOCH_LENGTH)],
    ["accHistory", AccumulationHistoryCodec(EPOCH_LENGTH)],
    ["privServices", PrivilegedServicesCodec],
    ["accounts", buildTestDeltaCodec(accumulateAccountCodec)],
  ]);

  const testBin = fs.readFileSync(
    `${__dirname}/../../../jamtestvectors/accumulate/${size}/${filename}.bin`,
  );

  const decoded = createCodec<TestCase>([
    [
      "input",
      createCodec<Input>([
        ["p_tau", posteriorCodec(E_sub_int<Tau>(4))],
        [
          "reports",
          createArrayLengthDiscriminator<AvailableWorkReports>(WorkReportCodec),
        ],
      ]),
    ],
    ["preState", stateCodec],
    [
      "output",
      eitherOneOfCodec<TestCase["output"]>([
        ["ok", MerkleTreeRootCodec],
        ["err", createCodec<{}>([])],
      ]),
    ],
    ["postState", stateCodec],
  ]).decode(testBin).value;

  const { input, preState, output, postState } = decoded;
  const testSTate = dummyState({
    validators: NUMVALS,
    cores: NCOR,
    epoch: EPLEN,
  });
  // NOTE:this is here so that we have an empty storage set fo the key used in `write` hostcall
  // this will have w7 set to the length of value (0) and make the pvm finish with Halt at 4787
  // instead of trap at 7464
  // this is only for `process_one_immediate_report-1` test
  /*
   preState.accounts
    .get(<ServiceIndex>1729)!
    .storage.set(
      <Hash>(
        18748680343547175133990789414536130980095420973019086018915209101056353955085n
      ),
      Buffer.alloc(0),
    );
  */
  // preState.accounts.get(<ServiceIndex>1729)!.preimage_l = new Map();

  const [, res] = accumulateReports(input.reports, {
    p_tau: input.p_tau,
    tau: preState.slot,
    accumulationHistory: preState.accHistory,
    accumulationQueue: preState.accQueue,
    serviceAccounts: preState.accounts,
    privServices: preState.privServices,
    iota: testSTate.iota,
    p_eta_0: preState.p_eta_0,
    authQueue: testSTate.authQueue,
  }).safeRet();

  expect(res.p_accumulationQueue).deep.equal(postState.accQueue);
  expect(res.p_accumulationHistory).deep.equal(postState.accHistory);
  expect(res.accumulateRoot).toEqual(output.ok);
  // TODO: compare other post states
};
describe("accumulate", () => {
  const set: "full" | "tiny" = "full";
  beforeEach(() => {
    if (set === <string>"tiny") {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
      mocks.EPOCH_LENGTH = 12;
      mocks.VALIDATOR_CORE_ROTATION = 4;
    }
  });
  // NOTE: regenerate with
  // for i in $(ls *.bin); do X=$(echo $i | cut -d "." -f1); echo 'it("'$X'", () => buildTest("'$X'", set));'; done
  it("accumulate_ready_queued_reports-1", () =>
    buildTest("accumulate_ready_queued_reports-1", set));
  it("enqueue_and_unlock_chain-1", () =>
    buildTest("enqueue_and_unlock_chain-1", set));
  it("enqueue_and_unlock_chain-2", () =>
    buildTest("enqueue_and_unlock_chain-2", set));
  it("enqueue_and_unlock_chain-3", () =>
    buildTest("enqueue_and_unlock_chain-3", set));
  it("enqueue_and_unlock_chain-4", () =>
    buildTest("enqueue_and_unlock_chain-4", set));
  it("enqueue_and_unlock_chain_wraps-1", () =>
    buildTest("enqueue_and_unlock_chain_wraps-1", set));
  it("enqueue_and_unlock_chain_wraps-2", () =>
    buildTest("enqueue_and_unlock_chain_wraps-2", set));
  it("enqueue_and_unlock_chain_wraps-3", () =>
    buildTest("enqueue_and_unlock_chain_wraps-3", set));
  it("enqueue_and_unlock_chain_wraps-4", () =>
    buildTest("enqueue_and_unlock_chain_wraps-4", set));
  it("enqueue_and_unlock_chain_wraps-5", () =>
    buildTest("enqueue_and_unlock_chain_wraps-5", set));
  it("enqueue_and_unlock_simple-1", () =>
    buildTest("enqueue_and_unlock_simple-1", set));
  it("enqueue_and_unlock_simple-2", () =>
    buildTest("enqueue_and_unlock_simple-2", set));
  it("enqueue_and_unlock_with_sr_lookup-1", () =>
    buildTest("enqueue_and_unlock_with_sr_lookup-1", set));
  it("enqueue_and_unlock_with_sr_lookup-2", () =>
    buildTest("enqueue_and_unlock_with_sr_lookup-2", set));
  it("enqueue_self_referential-1", () =>
    buildTest("enqueue_self_referential-1", set));
  it("enqueue_self_referential-2", () =>
    buildTest("enqueue_self_referential-2", set));
  it("enqueue_self_referential-3", () =>
    buildTest("enqueue_self_referential-3", set));
  it("enqueue_self_referential-4", () =>
    buildTest("enqueue_self_referential-4", set));
  it("no_available_reports-1", () => buildTest("no_available_reports-1", set));
  it("process_one_immediate_report-1", () =>
    buildTest("process_one_immediate_report-1", set));
  it("queues_are_shifted-1", () => buildTest("queues_are_shifted-1", set));
  it("queues_are_shifted-2", () => buildTest("queues_are_shifted-2", set));
  it("ready_queue_editing-1", () => buildTest("ready_queue_editing-1", set));
  it("ready_queue_editing-2", () => buildTest("ready_queue_editing-2", set));
  it("ready_queue_editing-3", () => buildTest("ready_queue_editing-3", set));
});
