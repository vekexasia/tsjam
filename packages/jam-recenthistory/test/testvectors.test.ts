import { describe, expect, it } from "vitest";
import { recentHistoryToDagger } from "@/stfs/toDagger.js";
import { recentHistoryToPosterior } from "@/stfs/toPosterior.js";
import {
  Hash,
  MerkeTreeRoot,
  RecentHistory,
  RecentHistoryItem,
  WorkPackageHash,
} from "@vekexasia/jam-types";
import { hextToBigInt } from "@vekexasia/jam-utils";

const testToState = (item: any): RecentHistoryItem => {
  return {
    accumulationResultMMR: item.mmr.peaks.map((acItem: any) => {
      if (acItem === null) {
        return undefined;
      } else {
        return hextToBigInt(acItem);
      }
    }),
    headerHash: hextToBigInt(item.header_hash),
    stateRoot: hextToBigInt(item.state_root),
    reportedPackages: item.reported.map(hextToBigInt),
  };
};

describe("recent-history", () => {
  const buildTest = (name: string) => {
    const tst = require(`./fixtures/${name}.json`);

    const preBeta: RecentHistory = tst.pre_state.beta.map(testToState);
    const inputData = {
      headerHash: hextToBigInt(tst.input.header_hash) as Hash,
      Hr: hextToBigInt(tst.input.parent_state_root) as MerkeTreeRoot,
      accumulateRoot: hextToBigInt(tst.input.accumulate_root) as MerkeTreeRoot,
      workPackageHashes: tst.input.work_packages.map((x: string) => {
        return hextToBigInt(x);
      }) as WorkPackageHash[],
    };

    const expected = recentHistoryToDagger.apply({ hr: inputData.Hr }, preBeta);
    const final = recentHistoryToPosterior.apply(inputData, expected);
    const post: RecentHistory = tst.post_state.beta.map(testToState);
    expect(final).toEqual(post);
  };
  it("progress_blocks_history-1", () => buildTest("progress_blocks_history-1"));
  it("progress_blocks_history-2", () => buildTest("progress_blocks_history-2"));
  it("progress_blocks_history-3", () => buildTest("progress_blocks_history-3"));
  it("progress_blocks_history-4", () => buildTest("progress_blocks_history-4"));
});
