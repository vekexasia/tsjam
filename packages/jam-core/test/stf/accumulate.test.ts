import packageJSON from "../../package.json";
import {
  AccumulationHistoryImpl,
  AccumulationQueueImpl,
  IdentityMap,
  IdentityMapCodec,
  PrivilegedServicesImpl,
  ServicesStatisticsImpl,
  SlotImpl,
  TauImpl,
  WorkReportImpl,
} from "@/index";
import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  buildGenericKeyValueCodec,
  codec,
  E_4_int,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentityCodec,
  lengthDiscriminatedCodec,
  MapJSONCodec,
  NumberJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import type {
  Hash,
  JamEntropy,
  Posterior,
  ServiceIndex,
  Validated,
} from "@tsjam/types";
import fs from "fs";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "../codec-utils";
import { TestServiceInfo } from "../common";

export const getFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../../jamtestvectors/stf/accumulate/${getConstantsMode()}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

@JamCodecable()
class TestAccount extends BaseJamCodecable {
  @codec(TestServiceInfo)
  service!: TestServiceInfo;

  @jsonCodec(
    MapJSONCodec(
      { key: "key", value: "value" },
      BufferJSONCodec(),
      BufferJSONCodec(),
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(
      LengthDiscrimantedIdentityCodec,
      LengthDiscrimantedIdentityCodec,
      (a, b) => Buffer.compare(a, b),
    ),
  )
  storage!: Map<Uint8Array, Uint8Array>;

  /**
   * -- This is mostly provided to lookup code blob for accumulate procedure execution
   * -- It is not supposed to be altered by this STF (i.e. posterior matches prior).
   */
  @codec(
    IdentityMapCodec(xBytesCodec(32), LengthDiscrimantedIdentityCodec, {
      key: "hash",
      value: "blob",
    }),
  )
  preimages!: IdentityMap<Hash, 32, Uint8Array>;
}

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(SlotImpl, "slot")
  tau!: Validated<Posterior<TauImpl>>;

  @codec(xBytesCodec(32), "entropy")
  p_eta_0!: Posterior<JamEntropy["_0"]>;

  @codec(AccumulationQueueImpl, "ready_queue")
  readyQueue!: AccumulationQueueImpl;

  @codec(AccumulationHistoryImpl, "accumulated")
  history!: AccumulationHistoryImpl;

  @codec(PrivilegedServicesImpl)
  privileges!: PrivilegedServicesImpl;

  @codec(ServicesStatisticsImpl)
  statistics!: ServicesStatisticsImpl;

  @jsonCodec(
    MapJSONCodec({ key: "id", value: "data" }, NumberJSONCodec(), TestAccount),
  )
  @binaryCodec(buildGenericKeyValueCodec(E_4_int, TestAccount, (a, b) => a - b))
  accounts!: Map<ServiceIndex, TestAccount>;
}

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(SlotImpl, "slot")
  p_tau!: Validated<Posterior<TauImpl>>;

  @lengthDiscriminatedCodec(WorkReportImpl)
  reports!: WorkReportImpl;
}

@JamCodecable()
export class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;

  @codec(TestState, "pre_state")
  preState!: TestState;

  @codec(TestOutputCodec(xBytesCodec(32)))
  output!: { err?: Error; ok?: Hash };

  @codec(TestState, "post_state")
  postState!: TestState;
}

const buildTest = (testname: string) => {
  const json = JSON.parse(
    Buffer.from(getFixtureFile(`${testname}.json`)).toString("utf8"),
  );
  const testCase = TestCase.fromJSON(json);

  // const testBin = TestCase.decode(getFixtureFile(`${testname}.bin`));
  expect(testCase.toJSON()).deep.eq(json);

  const _decoded = "";
  /*
  const { input, preState, output, postState } = decoded;
  const testSTate = dummyState({
    validators: NUMVALS,
    cores: NCOR,
    epoch: EPLEN,
  });
  // preState.accounts.get(<ServiceIndex>1729)!.preimage_l = new Map();
  console.log("preAccumulate");

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
  console.log("postAccumulate");
  const [, p_serviceStatistics] = serviceStatisticsSTF(
    {
      guaranteedReports: [],
      preimages: [],
      transferStatistics: new Map(),
      accumulationStatistics: res.accumulationStatistics,
    },
    preState.statistics,
  ).safeRet();

  expect(res.p_accumulationQueue).deep.equal(postState.accQueue);
  expect(res.p_accumulationHistory).deep.equal(postState.accHistory);
  expect(res.accumulateRoot).toEqual(output.ok);
  console.log(preState.statistics);
  console.log(p_serviceStatistics);

  expect(p_serviceStatistics).deep.equal(postState.statistics);

  */
};

describe.skipIf(packageJSON["jam:protocolVersion"] === "0.7.1")(
  "accumulate",
  () => {
    // NOTE: regenerate with
    // for i in $(ls *.bin); do X=$(echo $i | cut -d "." -f1); echo 'it("'$X'", () => buildTest("'$X'", set));'; done
    it("accumulate_ready_queued_reports-1", () =>
      buildTest("accumulate_ready_queued_reports-1"));
    it("enqueue_and_unlock_chain-1", () =>
      buildTest("enqueue_and_unlock_chain-1"));
    it("enqueue_and_unlock_chain-2", () =>
      buildTest("enqueue_and_unlock_chain-2"));
    it("enqueue_and_unlock_chain-3", () =>
      buildTest("enqueue_and_unlock_chain-3"));
    it("enqueue_and_unlock_chain-4", () =>
      buildTest("enqueue_and_unlock_chain-4"));
    it("enqueue_and_unlock_chain_wraps-1", () =>
      buildTest("enqueue_and_unlock_chain_wraps-1"));
    it("enqueue_and_unlock_chain_wraps-2", () =>
      buildTest("enqueue_and_unlock_chain_wraps-2"));
    it("enqueue_and_unlock_chain_wraps-3", () =>
      buildTest("enqueue_and_unlock_chain_wraps-3"));
    it("enqueue_and_unlock_chain_wraps-4", () =>
      buildTest("enqueue_and_unlock_chain_wraps-4"));
    it("enqueue_and_unlock_chain_wraps-5", () =>
      buildTest("enqueue_and_unlock_chain_wraps-5"));
    it("enqueue_and_unlock_simple-1", () =>
      buildTest("enqueue_and_unlock_simple-1"));
    it("enqueue_and_unlock_simple-2", () =>
      buildTest("enqueue_and_unlock_simple-2"));
    it("enqueue_and_unlock_with_sr_lookup-1", () =>
      buildTest("enqueue_and_unlock_with_sr_lookup-1"));
    it("enqueue_and_unlock_with_sr_lookup-2", () =>
      buildTest("enqueue_and_unlock_with_sr_lookup-2"));
    it("enqueue_self_referential-1", () =>
      buildTest("enqueue_self_referential-1"));
    it("enqueue_self_referential-2", () =>
      buildTest("enqueue_self_referential-2"));
    it("enqueue_self_referential-3", () =>
      buildTest("enqueue_self_referential-3"));
    it("enqueue_self_referential-4", () =>
      buildTest("enqueue_self_referential-4"));
    it("no_available_reports-1", () => buildTest("no_available_reports-1"));
    it("process_one_immediate_report-1", () =>
      buildTest("process_one_immediate_report-1"));
    it("queues_are_shifted-1", () => buildTest("queues_are_shifted-1"));
    it("queues_are_shifted-2", () => buildTest("queues_are_shifted-2"));
    it("ready_queue_editing-1", () => buildTest("ready_queue_editing-1"));
    it("ready_queue_editing-2", () => buildTest("ready_queue_editing-2"));
    it("ready_queue_editing-3", () => buildTest("ready_queue_editing-3"));
    it("same_code_different_services-1", () =>
      buildTest("same_code_different_services-1"));
  },
);
