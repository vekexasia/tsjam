import { describe, expect, it } from "vitest";
import * as fs from "node:fs";

import { hextToBigInt } from "@tsjam/utils";
import { EG_Extrinsic } from "@tsjam/types";
import {
  recentHistoryToDagger,
  recentHistoryToPosterior,
} from "@tsjam/transitions";
import { RecentHistoryJSONCodec } from "@tsjam/codec";

const getUTF8FixtureFile = (filename: string): string => {
  return fs.readFileSync(
    new URL(
      `../../../jamtestvectors/history/data/${filename}.json`,
      import.meta.url,
    ).pathname,
    "utf8",
  );
};

const buildTest = (name: string) => {
  const test = JSON.parse(getUTF8FixtureFile(name));
  const curState = RecentHistoryJSONCodec.fromJSON(test.pre_state.beta);
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

  const normalizedPosterior = RecentHistoryJSONCodec.toJSON(posterior)!;

  for (let i = 0; i < normalizedPosterior.length; i++) {
    expect(normalizedPosterior[i], `${i}`).toEqual(test.post_state.beta[i]);
  }

  expect(normalizedPosterior).toEqual(test.post_state.beta);
};
describe("recenthistory-test-vectors", () => {
  const test = (name: string) => buildTest(name);
  it("progress_blocks_history-1", () => test("progress_blocks_history-1"));
  it("progress_blocks_history-2", () => test("progress_blocks_history-2"));
  it("progress_blocks_history-3", () => test("progress_blocks_history-3"));
  it("progress_blocks_history-4", () => test("progress_blocks_history-4"));
});
