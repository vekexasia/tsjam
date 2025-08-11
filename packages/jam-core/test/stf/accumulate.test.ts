import { describe, it } from "vitest";
/*
type TestState = {
  slot: Tau;
  p_eta_0: Posterior<JamState["entropy"]["_0"]>;
  accQueue: AccumulationQueue;
  accHistory: AccumulationHistory;
  privServices: PrivilegedServices;
  statistics: JamStatistics["services"];
  accounts: Delta;
};

type Input = {
  p_tau: Posterior<Tau>;
  // reports: AvailableWorkReports;
};

type Output = MerkleTreeRoot; // accumulate Root

type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: Output; err?: {} };
  postState: TestState;
};

*/
const buildTest = (_filename: string) => {
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
  // TODO: compare other post states
};
describe("accumulate", () => {
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
});
