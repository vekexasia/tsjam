import { describe, it, vi, expect } from "vitest";
import fs from "fs";
import {
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  BlockCodec,
  createCodec,
} from "@tsjam/codec";
import { AuthorizerPool, AuthorizerQueue } from "@tsjam/types";

describe("jamduna", () => {
  it("try", () => {
    const kind = "tiny";

    const gen = BlockCodec.decode(
      fs.readFileSync(
        `${__dirname}/../../../jamtestnet/chainspecs/blocks/genesis-${kind}.bin`,
      ),
    );

    const state = fs.readFileSync(
      `${__dirname}/../../../jamtestnet/chainspecs/state_snapshots/genesis-${kind}.json`,
      "utf8",
    );

    console.log(state);

    // console.log(gen.value.header.blockAuthorKeyIndex);
    //console.log("ciao");
  });
});
