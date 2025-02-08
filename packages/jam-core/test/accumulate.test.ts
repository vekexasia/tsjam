import fs from "fs";
import {
  Blake2bHashCodec,
  buildGenericKeyValueCodec,
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
  WorkReport,
  MerkeTreeRoot,
  AvailableWorkReports,
} from "@tsjam/types";
import { vi, it, describe, beforeEach, expect } from "vitest";
import {
  posteriorCodec,
  serviceAccountFromTestInfo,
  Test_AccHistoryCodec,
  Test_AccQueueCodec,
} from "./testCodecs";
import { accumulateReports } from "@/accumulate";
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

type Output = MerkeTreeRoot; // accumulate Root

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
    ["accQueue", Test_AccQueueCodec(EPOCH_LENGTH)],
    ["accHistory", Test_AccHistoryCodec(EPOCH_LENGTH)],
    ["privServices", PrivilegedServicesCodec],
    [
      "accounts",
      buildGenericKeyValueCodec(
        E_sub_int<ServiceIndex>(4),
        accumulateAccountCodec,
        (a, b) => a - b,
      ),
    ],
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
  console.log(
    [...res.d_delta.get(<ServiceIndex>1729)!.storage.values()].map((a) =>
      Buffer.from(a).toString("ascii"),
    ),
  );

  expect(res.p_accumulationQueue).deep.equal(postState.accQueue);
  expect(res.p_accumulationHistory).deep.equal(postState.accHistory);
  expect(res.accumulateRoot).toEqual(output.ok);
  expect(true).toBe(false);
};
describe("accumulate", () => {
  const set: "full" | "tiny" = "tiny";
  beforeEach(() => {
    if (set === <string>"tiny") {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
      mocks.EPOCH_LENGTH = 12;
      mocks.VALIDATOR_CORE_ROTATION = 4;
    }
  });
  it("process_one_immediate_report-1", () => {
    buildTest("process_one_immediate_report-1", set);
  });
  it.skip("enqueue_self_referential-1", () => {
    buildTest("enqueue_self_referential-1", set);
  });
});
