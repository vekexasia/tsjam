import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import {
  hexToBytes,
  hextToBigInt,
  mapTestDataToSafroleState,
  safroleStateToTestData,
} from "./utils.js";

const mocks = vi.hoisted(() => {
  return {
    LOTTERY_MAX_SLOT: 200,
    MAX_TICKETS_PER_BLOCK: 16,
    NUMBER_OF_VALIDATORS: 6,
    EPOCH_LENGTH: 12,
    toTagged: (a) => a,
  };
});
vi.mock("@vekexasia/jam-types", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@vekexasia/jam-types")>()),
    ...mocks,
  };
});
import { computeNewSafroleState } from "@/state_updaters/stateUpdater.js";
import { toTagged } from "@vekexasia/jam-types";
import { TicketExtrinsics } from "@/extrinsics/index.js";
const test = (name: string) => {
  const test = JSON.parse(
    fs.readFileSync(`../../jamtestvectors/safrole/tiny/${name}.json`, "utf-8"),
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
describe("tiny", () => {
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
});
