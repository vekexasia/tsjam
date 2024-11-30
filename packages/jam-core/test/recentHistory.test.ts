import { describe, expect, it } from "vitest";
import * as fs from "node:fs";

import { bigintToBytes, hextToBigInt } from "@tsjam/utils";
import { EG_Extrinsic, RecentHistory, RecentHistoryItem } from "@tsjam/types";
import {
  recentHistoryToDagger,
  recentHistoryToPosterior,
} from "@tsjam/transitions";

const getUTF8FixtureFile = (filename: string): string => {
  return fs.readFileSync(
    new URL(
      `../../../jamtestvectors/history/data/${filename}.json`,
      import.meta.url,
    ).pathname,
    "utf8",
  );
};

const testCodec = {
  fromTest(json: any[]): RecentHistory {
    return json.map((historyItem: any) => {
      return {
        headerHash: hextToBigInt(historyItem.header_hash),
        stateRoot: hextToBigInt(historyItem.state_root),
        accumulationResultMMR: historyItem.mmr.peaks.map((peak: string) =>
          peak === null ? undefined : hextToBigInt(peak),
        ),
        reportedPackages: new Map(
          historyItem.reported.map((reported: any) => [
            hextToBigInt(reported.hash),
            hextToBigInt(reported.exports_root),
          ]),
        ),
      } as RecentHistoryItem;
    }) as RecentHistory;
  },
  toTest(data: RecentHistory): any {
    return data.map((historyItem) => {
      return {
        header_hash: `0x${Buffer.from(bigintToBytes(historyItem.headerHash, 32)).toString("hex")}`,
        mmr: {
          peaks: historyItem.accumulationResultMMR.map((peak) =>
            typeof peak === "undefined"
              ? null
              : `0x${Buffer.from(bigintToBytes(peak, 32)).toString("hex")}`,
          ),
        },
        state_root: `0x${Buffer.from(bigintToBytes(historyItem.stateRoot, 32)).toString("hex")}`,
        reported: Array.from(historyItem.reportedPackages.entries()).map(
          ([hash, exports_root]) => ({
            hash: `0x${Buffer.from(bigintToBytes(hash, 32)).toString("hex")}`,
            exports_root: `0x${Buffer.from(bigintToBytes(exports_root, 32)).toString("hex")}`,
          }),
        ),
      };
    });
  },
};

const buildTest = (name: string) => {
  const test = JSON.parse(getUTF8FixtureFile(name));
  const curState = testCodec.fromTest(test.pre_state.beta);
  const [, dagger] = recentHistoryToDagger(
    { hr: hextToBigInt(test.input.parent_state_root) },
    curState,
  ).safeRet();
  const [, posterior] = recentHistoryToPosterior(
    {
      headerHash: hextToBigInt(test.input.header_hash),
      accumulateRoot: hextToBigInt(test.input.accumulate_root),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eg: <EG_Extrinsic>test.input.work_packages.map((wp: any) => {
        return {
          workReport: {
            workPackageSpecification: {
              workPackageHash: hextToBigInt(wp.hash),
              segmentRoot: hextToBigInt(wp.exports_root),
            },
          },
        };
      }),
    },
    dagger,
  ).safeRet();
  const normalizedPosterior = testCodec.toTest(posterior);

  Object.keys(normalizedPosterior).forEach((key) => {
    expect(normalizedPosterior[key], `${key}`).toEqual(
      test.post_state.beta[key],
    );
  });
  expect(normalizedPosterior).toEqual(test.post_state.beta);
};
describe("recenthistory-test-vectors", () => {
  const test = (name: string) => buildTest(name);
  it("progress_blocks_history-1", () => test("progress_blocks_history-1"));
  it("progress_blocks_history-2", () => test("progress_blocks_history-2"));
  it("progress_blocks_history-3", () => test("progress_blocks_history-3"));
  it("progress_blocks_history-4", () => test("progress_blocks_history-4"));
});
