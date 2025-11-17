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
import { afterAll, assert, beforeAll, chai, describe, it } from "vitest";
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
        if (
          Buffer.compare(
            trace.preState.stateRoot,
            chainManager.bestBlock.posteriorState.merkleRoot(),
          ) !== 0
        ) {
          console.log(
            "Pre-state root does not match best block posterior state root",
            `Current: ${chainManager.bestBlock.posteriorState.merkleRoot().toString("hex")} Expected: ${trace.preState.stateRoot.toString("hex")}`,
          );
        }
        const res = await chainManager.handleIncomingBlock(trace.block);
        const didApplyblock = res.isOk();
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
          if (!didApplyblock) {
            // check if test expects us to apply
            if (
              Buffer.compare(
                trace.preState.stateRoot,
                trace.postState.stateRoot,
              ) !== 0
            ) {
              throw new Error(
                "Block was not applied, but expected state root differs from pre-state root. Failing test.",
              );
            }
          } else {
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
      } else {
        console.log("Error loading trace:", errTrace);
      }

      console.log(
        file,
        "ok",
        `tau: ${chainManager.bestBlock.header.slot.value} - root:${chainManager.bestBlock.posteriorState.merkleRoot().toString("hex")}`,
      );
    }
  };
  // for i in $(ls jam-conformance/fuzz-reports/0.7.1/traces/); do echo "it(\"$i\", () => doTest(\"$i\"));"; done

  it("1761552708", () => doTest("1761552708"));
  it("1761552851", () => doTest("1761552851"));
  it("1761553047", () => doTest("1761553047"));
  it("1761553072", () => doTest("1761553072"));
  it("1761553157", () => doTest("1761553157"));
  it("1761553506", () => doTest("1761553506"));
  it("1761553554", () => doTest("1761553554"));
  it("1761650152", () => doTest("1761650152"));
  it("1761650657", () => doTest("1761650657"));
  it("1761651476", () => doTest("1761651476"));
  it("1761651616", () => doTest("1761651616"));
  it("1761651767", () => doTest("1761651767"));
  it("1761651837", () => doTest("1761651837"));
  it("1761652427", () => doTest("1761652427"));
  it("1761652768", () => doTest("1761652768"));
  it("1761653013", () => doTest("1761653013"));
  it("1761653121", () => doTest("1761653121"));
  it("1761653246", () => doTest("1761653246"));
  it("1761654464", () => doTest("1761654464"));
  it("1761654584", () => doTest("1761654584"));
  it("1761654684", () => doTest("1761654684"));
  it("1761655910", () => doTest("1761655910"));
  it("1761656086", () => doTest("1761656086"));
  it("1761661472", () => doTest("1761661472"));
  it("1761661586", () => doTest("1761661586"));
  it("1761662449", () => doTest("1761662449"));
  it("1761662834", () => doTest("1761662834"));
  it("1761663151", () => doTest("1761663151"));
  it("1761663633", () => doTest("1761663633"));
  it("1761663744", () => doTest("1761663744"));
  it("1761663992", () => doTest("1761663992"));
  it("1761664166", () => doTest("1761664166"));
  it("1761664407", () => doTest("1761664407"));
  it("1761664779", () => doTest("1761664779"));
  it("1761665051", () => doTest("1761665051"));
  it("1761665268", () => doTest("1761665268"));
  it("1761665434", () => doTest("1761665434"));
  it("1761665520", () => doTest("1761665520"));
  it("1761666724", () => doTest("1761666724"));
  it("1761667005", () => doTest("1761667005"));
  it("1761667093", () => doTest("1761667093"));
  it("1763370844", () => doTest("1763370844"));
  it("1763370944", () => doTest("1763370944"));
  it("1763371072", () => doTest("1763371072"));
  it("1763371098", () => doTest("1763371098"));
  it("1763371127", () => doTest("1763371127"));
  it("1763371155", () => doTest("1763371155"));
  it("1763371341", () => doTest("1763371341"));
  it("1763371379", () => doTest("1763371379"));
  it("1763371403", () => doTest("1763371403"));
  it("1763371498", () => doTest("1763371498"));
  it("1763371531", () => doTest("1763371531"));
  it("1763371689", () => doTest("1763371689"));
  it("1763371865", () => doTest("1763371865"));
  it("1763371900", () => doTest("1763371900"));
  it("1763371949", () => doTest("1763371949"));
  it("1763371975", () => doTest("1763371975"));
  it("1763371998", () => doTest("1763371998"));
  it("1763372158", () => doTest("1763372158"));
  it("1763372255", () => doTest("1763372255"));
  it("1763372279", () => doTest("1763372279"));
  it("1763372314", () => doTest("1763372314"));
  it("1763372355", () => doTest("1763372355"));
  it("1763399245", () => doTest("1763399245"));
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
