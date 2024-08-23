import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import {
  hextToBigInt,
  mapTestDataToSafroleState,
  safroleStateToTestData,
} from "./utils.js";

const mocks = vi.hoisted(() => {
  return { NUMBER_OF_VALIDATORS: 6, EPOCH_LENGTH: 12, toTagged: (a) => a };
});
vi.mock("@vekexasia/jam-types", () => mocks);
import { computeNewSafroleState } from "@/state_updaters/stateUpdater.js";
import { toTagged } from "@vekexasia/jam-types";

describe("enact-epoch-change", () => {
  it("-with-no-tickets-1 should match post state", () => {
    const test = JSON.parse(
      fs.readFileSync(
        "../../jamtestvectors/safrole/tiny/enact-epoch-change-with-no-tickets-1.json",
        "utf-8",
      ),
    );
    const preState = mapTestDataToSafroleState(test.pre_state);

    const newPostState = computeNewSafroleState(
      preState,
      test.input.slot,
      toTagged(hextToBigInt(test.input.entropy)),
    );

    expect(safroleStateToTestData(newPostState)).toEqual(test.post_state);
  });
  it("-with-no-tickets-2 should match post state", () => {
    const test = JSON.parse(
      fs.readFileSync(
        "../../jamtestvectors/safrole/tiny/enact-epoch-change-with-no-tickets-2.json",
        "utf-8",
      ),
    );
    const preState = mapTestDataToSafroleState(test.pre_state);

    expect(() =>
      computeNewSafroleState(
        preState,
        test.input.slot,
        toTagged(hextToBigInt(test.input.entropy)),
      ),
    ).toThrow("Invalid slot");

    // assert no mods were made
    expect(safroleStateToTestData(preState)).toEqual(test.pre_state);
  });
  it("-with-no-tickets-3 should match post state", () => {
    const test = JSON.parse(
      fs.readFileSync(
        "../../jamtestvectors/safrole/tiny/enact-epoch-change-with-no-tickets-3.json",
        "utf-8",
      ),
    );
    const preState = mapTestDataToSafroleState(test.pre_state);

    const postState = computeNewSafroleState(
      preState,
      test.input.slot,
      toTagged(hextToBigInt(test.input.entropy)),
    );

    expect(safroleStateToTestData(postState)).toEqual(test.post_state);
  });
  it("-with-no-tickets-4 should match post state", () => {
    const test = JSON.parse(
      fs.readFileSync(
        "../../jamtestvectors/safrole/tiny/enact-epoch-change-with-no-tickets-4.json",
        "utf-8",
      ),
    );
    const preState = mapTestDataToSafroleState(test.pre_state);
    const postState = computeNewSafroleState(
      preState,
      test.input.slot,
      toTagged(hextToBigInt(test.input.entropy)),
    );

    expect(safroleStateToTestData(postState)).toEqual(test.post_state);
  });
});
