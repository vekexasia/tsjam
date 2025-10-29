import {
  AppliedBlock,
  ChainManager,
  IdentityMap,
  IdentityMapCodec,
  JamBlockImpl,
  JamSignedHeaderImpl,
  JamStateImpl,
} from "@/index";
import { resetTraceLog } from "@/utils";
import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import type { StateKey, StateRootHash } from "@tsjam/types";
import fs from "fs";
import { err, ok, Result } from "neverthrow";
import path from "path";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { reverseDifferentState } from "./utils";

describe.skipIf(getConstantsMode() == "full")("fuzzer_traces", () => {
  beforeAll(() => {
    process.env.RUNNING_TRACE_TESTS = "true";
  });
  afterAll(() => {
    process.env.RUNNING_TRACE_TESTS = "false";
  });
  const dir = `${__dirname}/../../../jam-conformance/fuzz-reports/0.7.1/traces/`;
  const doTest = async (what: string) => {
    const traceDir = `${dir}${what}/`;
    const files = fs
      .readdirSync(traceDir)
      .filter((a) => a.endsWith(".bin"))
      .sort((a, b) => a.localeCompare(b));

    const [err, initialTrace] = loadTrace(
      fs.readFileSync(path.join(traceDir, files[0])),
    ).safeRet();
    if (typeof err !== "undefined") {
      throw new Error(`Error loading initial trace: ${err}`);
    }
    initialTrace.block.header.signedHash = () =>
      initialTrace.block.header.parent;

    initialTrace.block.posteriorState = JamStateImpl.fromMerkleMap(
      initialTrace.preState.merkleMap,
    );
    const chainManager = await ChainManager.build(
      <AppliedBlock>initialTrace.block,
    );

    if (
      Buffer.compare(
        chainManager.bestBlock.posteriorState.merkleRoot(),
        initialTrace.preState.stateRoot,
      ) !== 0
    ) {
      console.log(
        "Expected merkle root:",
        Buffer.from(initialTrace.preState.stateRoot).toString("hex"),
      );
      console.log(
        "Got merkle root:",
        Buffer.from(
          chainManager.bestBlock.posteriorState.merkleRoot(),
        ).toString("hex"),
      );
    } else {
      console.log("initial state merkle matches... Proceeding");
    }

    //files.splice(0, 1);
    for (const file of files) {
      process.env.TRACE_FILE = `/tmp/trace_${what}_${file}.txt`;
      resetTraceLog();
      console.log(file);
      const [errTrace, trace] = loadTrace(
        fs.readFileSync(path.join(traceDir, file)),
      ).safeRet();
      if (typeof errTrace === "undefined") {
        const res = await chainManager.handleIncomingBlock(trace.block);
        if (res.isErr()) {
          console.log("Error applying block", res.error);
        } else {
          console.log(`${file} Block applied`);
        }
        if (
          Buffer.compare(
            chainManager.bestBlock.posteriorState.merkleRoot(),
            trace.postState.stateRoot,
          ) !== 0
        ) {
          console.log(
            "Expected merkle root:",
            Buffer.from(trace.postState.stateRoot).toString("hex"),
          );
          console.log(
            "Got merkle root:",
            Buffer.from(
              chainManager.bestBlock.posteriorState.merkleRoot(),
            ).toString("hex"),
          );
          const calculatedMap =
            chainManager.bestBlock.posteriorState.merkle.map;
          const expectedMap = trace.postState.merkleMap;
          const expectedState = JamStateImpl.fromMerkleMap(expectedMap);
          for (const [key, expectedValue] of expectedMap.entries()) {
            if (!calculatedMap.has(key)) {
              console.log(`Missing key ${key}`);
            } else if (
              Buffer.compare(calculatedMap.get(key)!, expectedValue) !== 0
            ) {
              reverseDifferentState(
                key,
                expectedState,
                chainManager.bestBlock.posteriorState,
              );
            }
          }
          throw new Error("diff");
        }
      }

      console.log(file, "ok");
    }
  };
  // for i in $(ls jam-conformance/fuzz-reports/0.7.0/traces/); do echo "it(\"$i\", () => doTest(\"$i\"));"; done
  it("1761552708", () => doTest("1761552708"));
  it("1761552851", () => doTest("1761552851"));
  it("1761553047", () => doTest("1761553047"));
  it("1761553072", () => doTest("1761553072"));
  it("1761553157", () => doTest("1761553157"));
  it("1761553506", () => doTest("1761553506"));
  it("1761553554", () => doTest("1761553554"));
  it("1761554906", () => doTest("1761554906"));
  it("1761554995", () => doTest("1761554995"));
});

@JamCodecable()
export class TraceState extends BaseJamCodecable {
  @codec(xBytesCodec(32), "state_root")
  stateRoot!: StateRootHash;

  @codec(
    IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
      key: "key",
      value: "value",
    }),
    "keyvals",
  )
  merkleMap!: IdentityMap<StateKey, 31, Buffer>;

  constructor(config?: Pick<TraceState, "merkleMap" | "stateRoot">) {
    super();

    if (typeof config !== "undefined") {
      this.merkleMap = config.merkleMap;
      this.stateRoot = config.stateRoot;
    }
  }
}

@JamCodecable()
export class TraceStep extends BaseJamCodecable {
  @codec(TraceState, "pre_state")
  preState!: TraceState;

  @codec(JamBlockImpl)
  block!: JamBlockImpl;

  @codec(TraceState, "post_state")
  postState!: TraceState;
}

@JamCodecable()
export class GenesisTrace extends BaseJamCodecable {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;
  @codec(TraceState)
  state!: TraceState;
}

export const loadTrace = (bin: Buffer): Result<TraceStep, string> => {
  try {
    const toRet = TraceStep.decode(bin);

    assert(
      toRet.readBytes === bin.length,
      `readBytes ${toRet.readBytes} !== bin.length ${bin.length}`,
    );
    assert(
      Buffer.compare(toRet.value.toBinary(), bin) === 0,
      "cannot re-encode",
    );

    return ok(toRet.value);
  } catch (e) {
    return err((e as Error).message);
  }
};
