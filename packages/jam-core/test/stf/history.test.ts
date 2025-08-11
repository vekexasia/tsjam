import { describe, it } from "vitest";
import "@/classes/BetaImpl";
import { HashCodec } from "@/codecs/miscCodecs";
import {
  BaseJamCodecable,
  codec,
  createCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import { HeaderHash, StateRootHash, WorkPackageHash } from "@tsjam/types";
import { Hash } from "node:crypto";
import fs from "node:fs";
import { BetaImpl } from "@/classes/BetaImpl";

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(HashCodec)
  headerHash!: HeaderHash;

  @codec(HashCodec)
  parentStateRoot!: StateRootHash;

  @codec(HashCodec)
  accumulateRoot!: Hash;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @lengthDiscriminatedCodec({ ...(<any>createCodec([
      ["hash", HashCodec],
      ["exportsRoot", HashCodec],
    ])), fromJSON() {}, toJSON() {} })
  workPackages!: Array<{
    hash: WorkPackageHash;
    exportsRoot: Hash;
  }>;
}

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(BetaImpl)
  beta!: BetaImpl;
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
  const bin = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/stf/history/full/${name}.bin`,
  );
  const { value: testCase } = TestCase.decode(bin);
};
describe("recenthistory-test-vectors", () => {
  const test = (name: string) => buildTest(name);
  it("progress_blocks_history-1", () => test("progress_blocks_history-1"));
  it("progress_blocks_history-3", () => test("progress_blocks_history-3"));
  it("progress_blocks_history-2", () => test("progress_blocks_history-2"));
  it("progress_blocks_history-4", () => test("progress_blocks_history-4"));
});
