import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import {
  disputesStateFromTest,
  disputesStateToTest,
  validatorEntryMap,
} from "./utils.js";

const mocks = vi.hoisted(() => {
  return {
    LOTTERY_MAX_SLOT: 500,
    MAX_TICKETS_PER_BLOCK: 16,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
    toTagged: (a: any) => a,
  };
});
vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };
  Object.defineProperty(toRet, "LOTTERY_MAX_SLOT", {
    get() {
      return mocks.LOTTERY_MAX_SLOT;
    },
  });
  Object.defineProperty(toRet, "MAX_TICKETS_PER_BLOCK", {
    get() {
      return mocks.MAX_TICKETS_PER_BLOCK;
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
  return toRet;
});
import { disputesSTF } from "@/disputesState.js";
import { DisputeExtrinsic } from "@tsjam/types";
import { hextToBigInt, toTagged } from "@tsjam/utils";
const buildTest = (name: string, size: "tiny" | "full") => {
  const test = JSON.parse(
    fs.readFileSync(
      `${__dirname}/../../../jamtestvectors/disputes/${size}/${name}.json`,
      "utf-8",
    ),
  );
  const verdicts: DisputeExtrinsic["verdicts"] =
    test.input.disputes.verdicts.map(
      (a: any): DisputeExtrinsic["verdicts"][0] => {
        return {
          epochIndex: a.age,
          hash: toTagged(hextToBigInt(a.target)),
          judgements: a.votes.map((j: any) => {
            return {
              signature: hextToBigInt(j.signature),
              validity: j.vote ? 1 : 0,
              validatorIndex: j.index,
            };
          }) as unknown as any,
        };
      },
    );
  const culprits: DisputeExtrinsic["culprit"] =
    test.input.disputes.culprits.map((e: any) => ({
      hash: hextToBigInt(e.target),
      ed25519PublicKey: hextToBigInt(e.key),
      signature: hextToBigInt(e.signature),
    }));
  const faults: DisputeExtrinsic["faults"] = test.input.disputes.faults.map(
    (e: any) => ({
      hash: hextToBigInt(e.target),
      validity: e.vote ? 1 : 0,
      ed25519PublicKey: hextToBigInt(e.key),
      signature: hextToBigInt(e.signature),
    }),
  );
  const extrinsic: DisputeExtrinsic = {
    verdicts,
    culprit: culprits,
    faults,
  };

  const kappa = test.pre_state.kappa.map(validatorEntryMap);
  const lambda = test.pre_state.lambda.map(validatorEntryMap);
  const preDisputesState = disputesStateFromTest(test.pre_state.psi);
  const post = disputesSTF.apply(
    { kappa: kappa, lambda, curTau: test.pre_state.tau, extrinsic },
    preDisputesState,
  );
  const postDisputesState = disputesStateToTest(post);
  expect(postDisputesState).toEqual(test.post_state.psi);
  // todo: miss check on rho which is present in tests
};
describe("disputes-test-vectors", () => {
  describe("tiny", () => {
    const test = (name: string) => buildTest(name, "tiny");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 10;
      mocks.EPOCH_LENGTH = 12;
      mocks.NUMBER_OF_VALIDATORS = 6;
    });
    it("progress_with_no_verdicts-1", () =>
      test("progress_with_no_verdicts-1"));
    it("progress_with_verdicts-1", () =>
      expect(() => test("progress_with_verdicts-1")).toThrow(
        "judgements must be ordered/unique by .validatorIndex",
      ));
    it("progress_with_verdicts-2", () =>
      expect(() => test("progress_with_verdicts-2")).toThrow(
        "judgements must be ordered/unique by .validatorIndex",
      ));
    it("progress_with_verdicts-3", () =>
      expect(() => test("progress_with_verdicts-3")).toThrow(
        "verdicts must be ordered/unique by .hash",
      ));
    it("progress_with_verdicts-4", () => test("progress_with_verdicts-4"));
    it("progress_with_verdicts-5", () =>
      expect(() => test("progress_with_verdicts-5")).toThrow(
        "judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS",
      ));
    it("progress_with_verdicts-6", () => test("progress_with_verdicts-6"));
    it("progress_with_culprits-1", () =>
      expect(() => test("progress_with_culprits-1")).toThrow(
        "negative verdicts must have at least 2 in culprit",
      ));
    it("progress_with_culprits-2", () =>
      expect(() => test("progress_with_culprits-2")).toThrow(
        "negative verdicts must have at least 2 in culprit",
      ));
    it("progress_with_culprits-3", () =>
      expect(() => test("progress_with_culprits-3")).toThrow(
        "culprit must be ordered/unique by .ed25519PublicKey",
      ));
    it("progress_with_culprits-4", () => test("progress_with_culprits-4"));
    it("progress_with_culprits-5", () =>
      expect(() => test("progress_with_culprits-5")).toThrow(
        "verdict.hash must not be in",
      ));
    it("progress_with_culprits-6", () =>
      expect(() => test("progress_with_culprits-6")).toThrow(
        "culprit.ed25519PublicKey must not be in",
      ));
    it("progress_with_culprits-7", () =>
      expect(() => test("progress_with_culprits-7")).toThrow(
        "culprit.hash must reference a verdict",
      ));
    it("progress_with_faults-1", () =>
      expect(() => test("progress_with_faults-1")).toThrow(
        "positive verdicts must be in faults",
      ));
    it("progress_with_faults-2", () => test("progress_with_faults-2"));
    it("progress_with_faults-3", () =>
      expect(() => test("progress_with_faults-3")).toThrow(
        "faults must be ordered/unique by .ed25519PublicKey",
      ));
    it("progress_with_faults-4", () => test("progress_with_faults-4"));
    it("progress_with_faults-5", () =>
      expect(() => test("progress_with_faults-5")).toThrow(
        "verdict.hash must not be in psi_g, psi_b or psi_w",
      ));
    it("progress_with_faults-6", () =>
      expect(() => test("progress_with_faults-6")).toThrow(
        "fault.ed25519PublicKey must not be in psi_o",
      ));
    it("progress_with_faults-7", () =>
      expect(() => test("progress_with_faults-7")).toThrow(
        "with fault validity 1, the report must be in psi_b' and not in psi_o'",
      ));
    it("progress_invalidates_avail_assignments-1", () =>
      test("progress_invalidates_avail_assignments-1"));
    it("progress_with_bad_signatures-1", () =>
      expect(() => test("progress_with_bad_signatures-1")).toThrow(
        "judgement signature is invalid",
      ));
    it("progress_with_bad_signatures-2", () =>
      expect(() => test("progress_with_bad_signatures-2")).toThrow(
        "culprit signature is invalid",
      ));
    it("progress_with_verdict_signatures_from_previous_set-1", () =>
      test("progress_with_verdict_signatures_from_previous_set-1"));
    it("progress_with_verdict_signatures_from_previous_set-2", () =>
      expect(() =>
        test("progress_with_verdict_signatures_from_previous_set-2"),
      ).toThrow("verdicts must be for the current or previous epoch"));
  });

  describe("full", () => {
    const test = (name: string) => buildTest(name, "full");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 500;
      mocks.EPOCH_LENGTH = 600;
      mocks.NUMBER_OF_VALIDATORS = 1023;
    });
    it("progress_with_no_verdicts-1", () =>
      test("progress_with_no_verdicts-1"));
    it("progress_with_verdicts-1", () =>
      expect(() => test("progress_with_verdicts-1")).toThrow(
        "judgements must be ordered/unique by .validatorIndex",
      ));
    it("progress_with_verdicts-2", () =>
      expect(() => test("progress_with_verdicts-2")).toThrow(
        "judgements must be ordered/unique by .validatorIndex",
      ));
    it("progress_with_verdicts-3", () =>
      expect(() => test("progress_with_verdicts-3")).toThrow(
        "verdicts must be ordered/unique by .hash",
      ));
    it("progress_with_verdicts-4", () => test("progress_with_verdicts-4"));
    it("progress_with_verdicts-5", () =>
      expect(() => test("progress_with_verdicts-5")).toThrow(
        "judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS",
      ));
    it("progress_with_verdicts-6", () => test("progress_with_verdicts-6"));
    it("progress_with_culprits-1", () =>
      expect(() => test("progress_with_culprits-1")).toThrow(
        "negative verdicts must have at least 2 in culprit",
      ));
    it("progress_with_culprits-2", () =>
      expect(() => test("progress_with_culprits-2")).toThrow(
        "negative verdicts must have at least 2 in culprit",
      ));
    it("progress_with_culprits-3", () =>
      expect(() => test("progress_with_culprits-3")).toThrow(
        "culprit must be ordered/unique by .ed25519PublicKey",
      ));
    it("progress_with_culprits-4", () => test("progress_with_culprits-4"));
    it("progress_with_culprits-5", () =>
      expect(() => test("progress_with_culprits-5")).toThrow(
        "verdict.hash must not be in",
      ));
    it("progress_with_culprits-6", () =>
      expect(() => test("progress_with_culprits-6")).toThrow(
        "culprit.ed25519PublicKey must not be in",
      ));
    it("progress_with_culprits-7", () =>
      expect(() => test("progress_with_culprits-7")).toThrow(
        "culprit.hash must reference a verdict",
      ));
    it("progress_with_faults-1", () =>
      expect(() => test("progress_with_faults-1")).toThrow(
        "positive verdicts must be in faults",
      ));
    it("progress_with_faults-2", () => test("progress_with_faults-2"));
    it("progress_with_faults-3", () =>
      expect(() => test("progress_with_faults-3")).toThrow(
        "faults must be ordered/unique by .ed25519PublicKey",
      ));
    it("progress_with_faults-4", () => test("progress_with_faults-4"));
    it("progress_with_faults-5", () =>
      expect(() => test("progress_with_faults-5")).toThrow(
        "verdict.hash must not be in psi_g, psi_b or psi_w",
      ));
    it("progress_with_faults-6", () =>
      expect(() => test("progress_with_faults-6")).toThrow(
        "fault.ed25519PublicKey must not be in psi_o",
      ));
    it("progress_with_faults-7", () =>
      expect(() => test("progress_with_faults-7")).toThrow(
        "with fault validity 1, the report must be in psi_b' and not in psi_o'",
      ));
    it("progress_invalidates_avail_assignments-1", () =>
      test("progress_invalidates_avail_assignments-1"));
    it("progress_with_bad_signatures-1", () =>
      expect(() => test("progress_with_bad_signatures-1")).toThrow(
        "judgement signature is invalid",
      ));
    it("progress_with_bad_signatures-2", () =>
      expect(() => test("progress_with_bad_signatures-2")).toThrow(
        "culprit signature is invalid",
      ));
    it("progress_with_verdict_signatures_from_previous_set-1", () =>
      test("progress_with_verdict_signatures_from_previous_set-1"));
    it("progress_with_verdict_signatures_from_previous_set-2", () =>
      expect(() =>
        test("progress_with_verdict_signatures_from_previous_set-2"),
      ).toThrow("verdicts must be for the current or previous epoch"));
  });
});
