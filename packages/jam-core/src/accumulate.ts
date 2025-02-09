import {
  CORES,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_ACCUMULATION_LOGIC,
} from "@tsjam/constants";
import {
  accumulatableReports,
  noPrereqAvailableReports,
  outerAccumulation,
  withPrereqAvailableReports,
} from "@tsjam/pvm";
import {
  accumulationHistoryToPosterior,
  accumulationQueueToPosterior,
  calculateAccumulateRoot,
} from "@tsjam/transitions";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerQueue,
  AvailableWorkReports,
  Delta,
  Gas,
  JamState,
  Posterior,
  PrivilegedServices,
  Tau,
} from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * Decides which reports to accumulate and accumulates them
 * computes a series of posterior states
 */
export const accumulateReports = (
  w: AvailableWorkReports,
  deps: {
    accumulationHistory: AccumulationHistory;
    accumulationQueue: AccumulationQueue;
    authQueue: AuthorizerQueue;
    serviceAccounts: Delta;
    tau: Tau;
    p_tau: Posterior<Tau>;
    privServices: PrivilegedServices;
    iota: JamState["iota"];
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
) => {
  /*
   * Integrate state to calculate several posterior state
   */
  const w_mark = noPrereqAvailableReports(w);
  const w_q = withPrereqAvailableReports(w, deps.accumulationHistory);
  const w_star = accumulatableReports(
    w_mark,
    w_q,
    deps.accumulationQueue,
    deps.p_tau,
  );

  // $(0.6.1 - 12.20)
  const g: Gas = [
    TOTAL_GAS_ACCUMULATION_ALL_CORES,
    TOTAL_GAS_ACCUMULATION_LOGIC * BigInt(CORES) +
      [...deps.privServices.alwaysAccumulate.values()].reduce(
        (a, b) => a + b,
        0n,
      ),
  ].reduce((a, b) => (a < b ? b : a)) as Gas;

  // $(0.6.1 - 12.21)
  const [nAccumulatedWork, o, bold_t, C] = outerAccumulation(
    g,
    w_star,
    {
      delta: deps.serviceAccounts,
      privServices: deps.privServices,
      authQueue: deps.authQueue,
      validatorKeys: deps.iota,
    },
    deps.privServices.alwaysAccumulate,
    {
      tau: deps.tau,
      p_tau: deps.p_tau,
      p_eta_0: deps.p_eta_0,
    },
  );

  const [, p_accumulationHistory] = accumulationHistoryToPosterior(
    {
      nAccumulatedWork,
      w_star,
      tau: deps.tau,
    },
    deps.accumulationHistory,
  ).safeRet();

  const [, p_accumulationQueue] = accumulationQueueToPosterior(
    {
      p_accHistory: p_accumulationHistory,
      p_tau: deps.p_tau,
      tau: deps.tau,
      w_q,
    },
    deps.accumulationQueue,
  ).safeRet();

  return ok({
    accumulateRoot: calculateAccumulateRoot(C),
    deferredTransfers: bold_t,
    p_accumulationHistory,
    p_accumulationQueue,
    // $(0.6.1 - 12.22)
    p_privServices: toPosterior(o.privServices),
    d_delta: toDagger(o.delta),
    p_iota: toPosterior(o.validatorKeys),
    p_authQueue: toPosterior(o.authQueue),
  });
};
