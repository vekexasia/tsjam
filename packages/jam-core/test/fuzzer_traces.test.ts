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
  const dir = `${__dirname}/../../../jam-conformance/fuzz-reports/0.7.2/traces/`;
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

  // for i in $(ls jam-conformance/fuzz-reports/0.7.2/traces/); do echo "it(\"$i\", () => doTest(\"$i\"));"; done
  //it("1766241814", () => doTest("1766241814"));
  it("1766241867", () => doTest("1766241867"));
  it("1766241968", () => doTest("1766241968"));
  it("1766242478", () => doTest("1766242478"));
  it("1766242569", () => doTest("1766242569"));
  it("1766242639", () => doTest("1766242639"));
  it("1766242660", () => doTest("1766242660"));
  it("1766243113", () => doTest("1766243113"));
  it("1766243147", () => doTest("1766243147"));
  it("1766243176", () => doTest("1766243176"));
  it("1766243315_1733", () => doTest("1766243315_1733"));
  it("1766243315_2078", () => doTest("1766243315_2078"));
  it("1766243315_2277", () => doTest("1766243315_2277"));
  it("1766243315_3530", () => doTest("1766243315_3530"));
  it("1766243315_6968", () => doTest("1766243315_6968"));
  it("1766243315_7092", () => doTest("1766243315_7092"));
  it("1766243315_7231", () => doTest("1766243315_7231"));
  it("1766243315_7763", () => doTest("1766243315_7763"));
  it("1766243315_8065", () => doTest("1766243315_8065"));
  it("1766243315_9206", () => doTest("1766243315_9206"));
  it("1766243315_9273", () => doTest("1766243315_9273"));
  it("1766243493_1016", () => doTest("1766243493_1016"));
  it("1766243493_1163", () => doTest("1766243493_1163"));
  it("1766243493_2605", () => doTest("1766243493_2605"));
  it("1766243493_2637", () => doTest("1766243493_2637"));
  it("1766243493_2882", () => doTest("1766243493_2882"));
  it("1766243493_5192", () => doTest("1766243493_5192"));
  it("1766243493_6113", () => doTest("1766243493_6113"));
  it("1766243493_8886", () => doTest("1766243493_8886"));
  it("1766243493_9727", () => doTest("1766243493_9727"));
  it("1766243493_9922", () => doTest("1766243493_9922"));
  it("1766243774_5938", () => doTest("1766243774_5938"));
  it("1766243774_6746", () => doTest("1766243774_6746"));
  it("1766243861_2056", () => doTest("1766243861_2056"));
  it("1766243861_2612", () => doTest("1766243861_2612"));
  it("1766243861_5589", () => doTest("1766243861_5589"));
  it("1766243861_7039", () => doTest("1766243861_7039"));
  it("1766243861_7323", () => doTest("1766243861_7323"));
  it("1766243861_7767", () => doTest("1766243861_7767"));
  it("1766243861_8319", () => doTest("1766243861_8319"));
  it("1766243861_8838", () => doTest("1766243861_8838"));
  it("1766243861_8892", () => doTest("1766243861_8892"));
  it("1766243861_9909", () => doTest("1766243861_9909"));
  it("1766244033_5444", () => doTest("1766244033_5444"));
  it("1766244122_3342", () => doTest("1766244122_3342"));
  it("1766244122_3401", () => doTest("1766244122_3401"));
  it("1766244122_3562", () => doTest("1766244122_3562"));
  it("1766244122_5414", () => doTest("1766244122_5414"));
  it("1766244122_5900", () => doTest("1766244122_5900"));
  it("1766244122_6899", () => doTest("1766244122_6899"));
  it("1766244122_6938", () => doTest("1766244122_6938"));
  it("1766244122_7675", () => doTest("1766244122_7675"));
  it("1766244122_8730", () => doTest("1766244122_8730"));
  it("1766244122_9726", () => doTest("1766244122_9726"));
  it("1766244251_1055", () => doTest("1766244251_1055"));
  it("1766244251_1244", () => doTest("1766244251_1244"));
  it("1766244251_1816", () => doTest("1766244251_1816"));
  it("1766244251_2288", () => doTest("1766244251_2288"));
  it("1766244251_2939", () => doTest("1766244251_2939"));
  it("1766244251_4514", () => doTest("1766244251_4514"));
  it("1766244251_5231", () => doTest("1766244251_5231"));
  it("1766244251_5493", () => doTest("1766244251_5493"));
  it("1766244251_6558", () => doTest("1766244251_6558"));
  it("1766244251_9568", () => doTest("1766244251_9568"));
  it("1766244556_3963", () => doTest("1766244556_3963"));
  it("1766244556_4989", () => doTest("1766244556_4989"));
  it("1766244556_6133", () => doTest("1766244556_6133"));
  it("1766255635_1584", () => doTest("1766255635_1584"));
  it("1766255635_2170", () => doTest("1766255635_2170"));
  it("1766255635_2557", () => doTest("1766255635_2557"));
  it("1766255635_3335", () => doTest("1766255635_3335"));
  it("1766255635_3673", () => doTest("1766255635_3673"));
  it("1766255635_3689", () => doTest("1766255635_3689"));
  it("1766255635_4398", () => doTest("1766255635_4398"));
  it("1766255635_7054", () => doTest("1766255635_7054"));
  it("1766255635_7229", () => doTest("1766255635_7229"));
  it("1766255777_4629", () => doTest("1766255777_4629"));
  it("1766255777_6480", () => doTest("1766255777_6480"));
  it("1766255777_8627", () => doTest("1766255777_8627"));
  it("1766255961_5132", () => doTest("1766255961_5132"));
  it("1766256032_8838", () => doTest("1766256032_8838"));
  it("1766256151_4088", () => doTest("1766256151_4088"));
  it("1766256151_5250", () => doTest("1766256151_5250"));
  it("1766256151_9235", () => doTest("1766256151_9235"));
  it("1766479507_1044", () => doTest("1766479507_1044"));
  it("1766479507_1854", () => doTest("1766479507_1854"));
  it("1766479507_2200", () => doTest("1766479507_2200"));
  it("1766479507_3250", () => doTest("1766479507_3250"));
  it("1766479507_3537", () => doTest("1766479507_3537"));
  it("1766479507_4840", () => doTest("1766479507_4840"));
  it("1766479507_5115", () => doTest("1766479507_5115"));
  it("1766479507_5629", () => doTest("1766479507_5629"));
  it("1766479507_6078", () => doTest("1766479507_6078"));
  it("1766479507_6139", () => doTest("1766479507_6139"));
  it("1766479507_7090", () => doTest("1766479507_7090"));
  it("1766479507_7734", () => doTest("1766479507_7734"));
  it("1766479507_7943", () => doTest("1766479507_7943"));
  it("1766479507_8988", () => doTest("1766479507_8988"));
  it("1766479507_9966", () => doTest("1766479507_9966"));
  it("1766565819_1194", () => doTest("1766565819_1194"));
  it("1766565819_2010", () => doTest("1766565819_2010"));
  it("1766565819_3269", () => doTest("1766565819_3269"));
  it("1766565819_3355", () => doTest("1766565819_3355"));
  it("1766565819_4018", () => doTest("1766565819_4018"));
  it("1766565819_4337", () => doTest("1766565819_4337"));
  it("1766565819_4872", () => doTest("1766565819_4872"));
  it("1766565819_5430", () => doTest("1766565819_5430"));
  it("1766565819_6597", () => doTest("1766565819_6597"));
  it("1766565819_7557", () => doTest("1766565819_7557"));
  it("1766565819_7584", () => doTest("1766565819_7584"));
  it("1766565819_9888", () => doTest("1766565819_9888"));
  it("1766565819_9942", () => doTest("1766565819_9942"));
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
