import { describe, it, vi, expect } from "vitest";
import fs from "fs";
import { AuthorizerPoolCodec, AuthorizerQueueCodec, BlockCodec, createCodec } from "@tsjam/codec";
import { AuthorizerPool, AuthorizerQueue } from "@tsjam/types";

const ChainStateCodec = createCodec<{
  authPool: AuthorizerPool,
  authQueue: AuthorizerQueue,

}>([
  ["authPool", AuthorizerPoolCodec()],
  ["authQueue", AuthorizerQueueCodec()],

])
describe("jamduna", () => {

  it("try", () => {
    const kind = "full";

    const gen = BlockCodec.decode(fs.readFileSync(`${__dirname}/../../../jamtestnet/chainspecs/blocks/genesis-${kind}.bin`));

    const state =
      console.log("ciao");
    console.log(gen.value.header.blockAuthorKeyIndex);
    console.log("ciao");



  });
});
