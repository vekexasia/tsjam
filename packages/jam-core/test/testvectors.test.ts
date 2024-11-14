import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import { mapTestDataToState, stateToTestData } from "./utils.js";

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
import { IDisputesState, TicketExtrinsics } from "@tsjam/types";
import { hexToBytes, hextToBigInt, toPosterior, toTagged } from "@tsjam/utils";
import {
  entropyRotationSTF,
  etToIdentifiers,
  eta0STF,
  gamma_aSTF,
  gamma_sSTF,
  rotateKeys,
  safroleToPosterior,
} from "@tsjam/transitions";
const buildTest = (name: string, size: "tiny" | "full") => {
  const test = JSON.parse(
    fs.readFileSync(
      `${__dirname}/../../../jamtestvectors/safrole/${size}/${name}.json`,
      "utf-8",
    ),
  );
  const curState = mapTestDataToState(test.pre_state);
  const tickets: TicketExtrinsics = test.input.extrinsic.map(
    (e: { attempt: number; signature: string }) => ({
      entryIndex: e.attempt,
      proof: hexToBytes(e.signature),
    }),
  );
  const tauTransition = {
    tau: curState.tau,
    p_tau: toPosterior(test.input.slot),
  };

  // TODO: make these 2 a single STF with proper inputs
  const [, p_entropy] = entropyRotationSTF(
    tauTransition,
    curState.entropy,
  ).safeRet();
  const [, entropy0] = eta0STF(
    hextToBigInt(test.input.entropy),
    curState.entropy[0],
  ).safeRet();
  p_entropy[0] = entropy0;

  const p_disputesState: IDisputesState = {
    psi_o: new Set(),
    psi_b: new Set(),
    psi_g: new Set(),
    psi_w: new Set(),
  };

  const [, [p_lambda, p_kappa, p_gamma_k, p_gamma_z]] = rotateKeys(
    {
      p_psi_o: toPosterior(p_disputesState.psi_o),
      iota: curState.iota,
      ...tauTransition,
    },
    [
      curState.lambda,
      curState.kappa,
      curState.safroleState.gamma_k,
      curState.safroleState.gamma_z,
    ],
  ).safeRet();

  const ticketIdentifiers = etToIdentifiers(tickets, {
    p_tau: tauTransition.p_tau,
    gamma_z: curState.safroleState.gamma_z,
    gamma_a: curState.safroleState.gamma_a,
    p_entropy,
  })._unsafeUnwrap();

  const p_gamma_s = gamma_sSTF(
    {
      ...tauTransition,
      gamma_a: curState.safroleState.gamma_a,
      gamma_s: curState.safroleState.gamma_s,
      p_kappa,
      p_eta: p_entropy,
    },
    curState.safroleState.gamma_s,
  )._unsafeUnwrap();

  const p_gamma_a = gamma_aSTF(
    {
      ...tauTransition,
      newIdentifiers: ticketIdentifiers,
    },
    curState.safroleState.gamma_a,
  )._unsafeUnwrap();

  const p_safroleState = safroleToPosterior(
    {
      p_gamma_a,
      p_gamma_k,
      p_gamma_s,
      p_gamma_z,
    },
    curState.safroleState,
  )._unsafeUnwrap();

  const normalizedPostState = stateToTestData({
    ...curState,
    entropy: p_entropy,
    safroleState: p_safroleState,
    kappa: p_kappa,
    lambda: p_lambda,
    iota: curState.iota, // TODO: this is wrong?
    tau: tauTransition.p_tau,
  });

  Object.keys(normalizedPostState).forEach((key) => {
    expect((normalizedPostState as any)[key], `${key}`).toEqual(
      test.post_state[key],
    );
  });
  expect(normalizedPostState).toEqual(test.post_state);
};
describe("safrole-test-vectors", () => {
  describe("full", () => {
    const test = (name: string) => buildTest(name, "full");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 500;
      mocks.EPOCH_LENGTH = 600;
      mocks.NUMBER_OF_VALIDATORS = 1023;
    });
    it("enact-epoch-change-with-no-tickets-1", () =>
      test("enact-epoch-change-with-no-tickets-1"));
    // it("enact-epoch-change-with-no-tickets-2", () =>
    //   expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
    //     "Invalid slot",
    //   ));
    it("enact-epoch-change-with-no-tickets-3", () =>
      test("enact-epoch-change-with-no-tickets-3"));
    it("enact-epoch-change-with-no-tickets-4", () =>
      test("enact-epoch-change-with-no-tickets-4"));
    it("skip-epoch-tail-1", () => test("skip-epoch-tail-1"));
    it("skip-epochs-1", () => test("skip-epochs-1"));
    it("publish-tickets-no-mark-1", () =>
      expect(() => test("publish-tickets-no-mark-1")).toThrow(
        "Entry index must be 0 or 1",
      ));
    it("publish-tickets-no-mark-2", () => test("publish-tickets-no-mark-2"));
    it("publish-tickets-no-mark-3", () =>
      expect(() => test("publish-tickets-no-mark-3")).toThrow(
        "Ticket id already in gamma_a",
      ));
    it("publish-tickets-no-mark-4", () =>
      expect(() => test("publish-tickets-no-mark-4")).toThrow(
        "VRF outputs must be in ascending order and not duplicate",
      ));
    it("publish-tickets-no-mark-5", () =>
      expect(() => test("publish-tickets-no-mark-5")).toThrow(
        "Invalid VRF proof",
      ));
    it("publish-tickets-no-mark-6", () => test("publish-tickets-no-mark-6"));
    it("publish-tickets-no-mark-7", () =>
      expect(() => test("publish-tickets-no-mark-7")).toThrow(
        "Lottery has ended",
      ));
    it("publish-tickets-no-mark-8", () => test("publish-tickets-no-mark-8"));
    it("publish-tickets-no-mark-9", () => test("publish-tickets-no-mark-9"));
    it("publish-tickets-with-mark-1", () =>
      test("publish-tickets-with-mark-1"));
    it("publish-tickets-with-mark-2", () =>
      test("publish-tickets-with-mark-2"));
    it("publish-tickets-with-mark-3", () =>
      test("publish-tickets-with-mark-3"));
    it("publish-tickets-with-mark-4", () =>
      test("publish-tickets-with-mark-4"));
    it("publish-tickets-with-mark-5", () =>
      test("publish-tickets-with-mark-5"));
  });
  describe("tiny", () => {
    const test = (name: string) => buildTest(name, "tiny");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 10;
      mocks.EPOCH_LENGTH = 12;
      mocks.NUMBER_OF_VALIDATORS = 6;
    });
    it("enact-epoch-change-with-no-tickets-1", () =>
      test("enact-epoch-change-with-no-tickets-1"));
    // it("enact-epoch-change-with-no-tickets-2", () =>
    //   expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
    //     "Invalid slot",
    //   ));
    it("enact-epoch-change-with-no-tickets-3", () =>
      test("enact-epoch-change-with-no-tickets-3"));
    it("enact-epoch-change-with-no-tickets-4", () =>
      test("enact-epoch-change-with-no-tickets-4"));
    it("skip-epoch-tail-1", () => test("skip-epoch-tail-1"));
    it("skip-epochs-1", () => test("skip-epochs-1"));
    it("publish-tickets-no-mark-1", () =>
      expect(() => test("publish-tickets-no-mark-1")).toThrow(
        "Entry index must be 0 or 1",
      ));
    it("publish-tickets-no-mark-2", () => test("publish-tickets-no-mark-2"));
    it("publish-tickets-no-mark-3", () =>
      expect(() => test("publish-tickets-no-mark-3")).toThrow(
        "Ticket id already in gamma_a",
      ));
    it("publish-tickets-no-mark-4", () =>
      expect(() => test("publish-tickets-no-mark-4")).toThrow(
        "VRF outputs must be in ascending order and not duplicate",
      ));
    it("publish-tickets-no-mark-5", () =>
      expect(() => test("publish-tickets-no-mark-5")).toThrow(
        "Invalid VRF proof",
      ));
    it("publish-tickets-no-mark-6", () => test("publish-tickets-no-mark-6"));
    it("publish-tickets-no-mark-7", () =>
      expect(() => test("publish-tickets-no-mark-7")).toThrow(
        "Lottery has ended",
      ));
    it("publish-tickets-no-mark-8", () => test("publish-tickets-no-mark-8"));
    it("publish-tickets-no-mark-9", () => test("publish-tickets-no-mark-9"));
    it("publish-tickets-with-mark-1", () =>
      test("publish-tickets-with-mark-1"));
    it("publish-tickets-with-mark-2", () =>
      test("publish-tickets-with-mark-2"));
    it("publish-tickets-with-mark-3", () =>
      test("publish-tickets-with-mark-3"));
    it("publish-tickets-with-mark-4", () =>
      test("publish-tickets-with-mark-4"));
    it("publish-tickets-with-mark-5", () =>
      test("publish-tickets-with-mark-5"));
  });
});
