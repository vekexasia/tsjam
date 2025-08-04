import { describe, expect, it, test } from "vitest";
import * as fs from "node:fs";

import {
  EG_Extrinsic,
  HeaderHash,
  MerkleTreeRoot,
  StateRootHash,
  WorkPackageHash,
} from "@tsjam/types";
import {
  BaseJamCodecable,
  codec,
  createCodec,
  HashCodec,
  hashCodec,
  HashJSONCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import { Hash } from "node:crypto";
import { RecentHistoryImpl } from "@/classes/RecentHistoryImpl";

const getFixtureFile = (filename: string): Uint8Array => {
  return fs.readFileSync(
    new URL(
      `../../../jamtestvectors/stf/history/full/${filename}.bin`,
      import.meta.url,
    ).pathname,
  );
};

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @hashCodec()
  headerHash!: HeaderHash;

  @hashCodec()
  parentStateRoot!: StateRootHash;

  @hashCodec()
  accumulateRoot!: Hash;

  @lengthDiscriminatedCodec({ ...(<any>createCodec([
      ["hash", HashCodec],
      ["exportsRoot", HashCodec],
    ])), fromJSON(json) {}, toJSON(value) {} })
  workPackages!: Array<{
    hash: WorkPackageHash;
    exportsRoot: Hash;
  }>;
}

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(RecentHistoryImpl)
  beta!: RecentHistoryImpl;
}

@JamCodecable()
class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;
  @codec(TestState)
  preState!: TestState;
  @codec(TestState)
  postState!: TestState;
}

const buildTest = (name: string) => {
  // TODO:
};
describe("recenthistory-test-vectors", () => {
  const test = (name: string) => buildTest(name);
  it("progress_blocks_history-1", () => test("progress_blocks_history-1"));
  it("progress_blocks_history-2", () => test("progress_blocks_history-2"));
  it("progress_blocks_history-3", () => test("progress_blocks_history-3"));
  it("progress_blocks_history-4", () => test("progress_blocks_history-4"));
});
