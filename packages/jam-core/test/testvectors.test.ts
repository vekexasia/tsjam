import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import { mapTestDataToSafroleState, safroleStateToTestData } from "./utils.js";

const mocks = vi.hoisted(() => {
  return {
    LOTTERY_MAX_SLOT: 500,
    MAX_TICKETS_PER_BLOCK: 16,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
    toTagged: (a: any) => a,
  };
});
vi.mock("@vekexasia/jam-constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@vekexasia/jam-constants")>()),
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
import { TicketExtrinsics } from "@vekexasia/jam-types";
import { hexToBytes, hextToBigInt, toTagged } from "@vekexasia/jam-utils";
import { computeNewSafroleState } from "@vekexasia/jam-transitions";
const buildTest = (name: string, size: "tiny" | "full") => {
  const test = JSON.parse(
    fs.readFileSync(
      `${__dirname}/../../../jamtestvectors/safrole/${size}/${name}.json`,
      "utf-8",
    ),
  );
  const preState = mapTestDataToSafroleState(test.pre_state);
  const tickets: TicketExtrinsics = test.input.extrinsic.map(
    (e: { attempt: number; signature: string }) => ({
      entryIndex: e.attempt,
      proof: hexToBytes(e.signature),
    }),
  );
  const postState = computeNewSafroleState(
    preState,
    test.input.slot,
    toTagged(hextToBigInt(test.input.entropy)),
    tickets,
  );
  const normalizedPostState = safroleStateToTestData(postState);

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
    it("enact-epoch-change-with-no-tickets-2", () =>
      expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
        "Invalid slot",
      ));
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
    it("enact-epoch-change-with-no-tickets-2", () =>
      expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
        "Invalid slot",
      ));
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
