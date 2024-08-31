import { beforeEach, describe, it, expect } from "vitest";
import { RecentHistory, RecentHistoryItem } from "@/type.js";
import { bytesToBigInt } from "@vekexasia/jam-codec";
import { EG_Extrinsic } from "@vekexasia/jam-work";
import { recentHistoryToDagger } from "@/stfs/toDagger.js";
import { recentHistoryToPosterior } from "@/stfs/toPosterior.js";
import { Hash, MerkeTreeRoot } from "@vekexasia/jam-types";

export const hexToBytes = (hex: string): Uint8Array => {
  return Buffer.from(hex.slice(2), "hex");
};
export const hextToBigInt = <T extends bigint>(hex: string): T => {
  return bytesToBigInt(hexToBytes(hex)) as unknown as T;
};
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
    workReports: item.reported.map(hextToBigInt),
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
      EG: tst.input.work_packages
        .map((x: string) => {
          return hextToBigInt(x);
        })
        .map((x: bigint) => {
          return {
            workReport: {
              workPackageSpecification: {
                workPackageHash: x,
              },
            },
          };
        }) as EG_Extrinsic,
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
