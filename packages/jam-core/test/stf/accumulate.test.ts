import { accumulateReports } from "@/accumulate";
import {
  AccumulationHistoryImpl,
  AccumulationQueueImpl,
  AuthorizerQueueImpl,
  DeltaImpl,
  GuaranteesExtrinsicImpl,
  IdentityMap,
  IdentityMapCodec,
  MerkleServiceAccountStorageImpl,
  NewWorkReportsImpl,
  PreimagesExtrinsicImpl,
  PrivilegedServicesImpl,
  ServiceAccountImpl,
  ServicesStatisticsImpl,
  SlotImpl,
  TauImpl,
  ValidatorsImpl,
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
import { toTagged } from "@tsjam/utils";
import fs from "fs";
import { describe, expect, it } from "vitest";
import packageJSON from "../../package.json";
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

  toServiceAccount(serviceIndex: ServiceIndex) {
    const service = this.service.toServiceAccount(serviceIndex);
    const sa = new ServiceAccountImpl(
      {
        codeHash: service.codeHash,
        balance: service.balance,
        minAccGas: service.minAccGas,
        minMemoGas: service.minMemoGas,
        gratis: service.gratis,
        created: service.created,
        lastAcc: service.lastAcc,
        parent: service.parent,
        preimages: this.preimages,
      },
      new MerkleServiceAccountStorageImpl(serviceIndex),
    );

    for (const [key, blob] of this.storage) {
      sa.storage.set(key, blob);
    }

    sa.preimages = this.preimages;

    return sa;
  }
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
  reports!: WorkReportImpl[];
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

  expect(testCase.toJSON()).deep.eq(json);

  const newWR = new NewWorkReportsImpl(testCase.input.reports);

  const delta = DeltaImpl.newEmpty();
  [...testCase.preState.accounts.entries()].forEach(
    ([serviceIndex, testAccount]) =>
      delta.set(serviceIndex, testAccount.toServiceAccount(serviceIndex)),
  );

  const res = accumulateReports(newWR, {
    accumulationHistory: testCase.preState.history,
    accumulationQueue: testCase.preState.readyQueue,
    p_eta_0: testCase.preState.p_eta_0,
    iota: toTagged(ValidatorsImpl.newEmpty()),
    authQueue: AuthorizerQueueImpl.newEmpty(),
    p_tau: testCase.input.p_tau,
    privServices: testCase.preState.privileges,
    tau: testCase.preState.tau,
    serviceAccounts: delta,
  });

  const posteriorStatistics = testCase.preState.statistics.toPosterior({
    accumulationStatistics: res.accumulationStatistics,
    // transferStatistics: new Map(),
    ep: toTagged(PreimagesExtrinsicImpl.newEmpty()),
    guaranteedReports: GuaranteesExtrinsicImpl.newEmpty().workReports(),
  });

  expect(posteriorStatistics.toJSON()).deep.eq(
    testCase.postState.statistics.toJSON(),
  );
  expect(res.p_accumulationQueue.toJSON()).deep.eq(
    testCase.postState.readyQueue.toJSON(),
  );
  expect(res.p_accumulationHistory.toJSON()).deep.eq(
    testCase.postState.history.toJSON(),
  );

  const accMerkleRoot = res.p_mostRecentAccumulationOutputs.merkleRoot();

  console.log(`accumulated root: ${xBytesCodec(32).toJSON(accMerkleRoot)}`);
  const dd_delta = res.d_delta.toDoubleDagger({
    accumulationStatistics: res.accumulationStatistics,
    // invokedTransfers: res.deferredTransfers.invokedTransfers({
    //   d_delta: res.d_delta,
    //   p_tau: testCase.input.p_tau,
    //   p_eta_0: testCase.preState.p_eta_0,
    // }),
    p_tau: testCase.input.p_tau,
  });
  for (const [sid, sa] of testCase.postState.accounts) {
    expect(dd_delta.has(sid)).toBe(true);

    const expectedSA = sa.toServiceAccount(sid)!;
    const ourSA = dd_delta.get(sid)!;
    expect(
      expectedSA.equals(ourSA),
      "expected account different than out",
    ).toBe(true);
  }

  expect(res.p_privServices.toJSON()).deep.eq(
    testCase.postState.privileges.toJSON(),
  );
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
