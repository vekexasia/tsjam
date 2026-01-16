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
                console.log(`Missing key ${key.toString("hex")}`);
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
  //
  it("1766241814", () => doTest("1766241814"));
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
  it("1767827127_1243", () => doTest("1767827127_1243"));
  it("1767827127_2328", () => doTest("1767827127_2328"));
  it("1767871405_1375", () => doTest("1767871405_1375"));
  it("1767871405_1393", () => doTest("1767871405_1393"));
  it("1767871405_1629", () => doTest("1767871405_1629"));
  it("1767871405_1773", () => doTest("1767871405_1773"));
  it("1767871405_1855", () => doTest("1767871405_1855"));
  it("1767871405_1947", () => doTest("1767871405_1947"));
  it("1767871405_2391", () => doTest("1767871405_2391"));
  it("1767871405_3282", () => doTest("1767871405_3282"));
  it("1767871405_3616", () => doTest("1767871405_3616"));
  it("1767871405_5318", () => doTest("1767871405_5318"));
  it("1767871405_5350", () => doTest("1767871405_5350"));
  it("1767871405_6428", () => doTest("1767871405_6428"));
  it("1767871405_6987", () => doTest("1767871405_6987"));
  it("1767871405_8674", () => doTest("1767871405_8674"));
  it("1767871405_9376", () => doTest("1767871405_9376"));
  it("1767871405_9518", () => doTest("1767871405_9518"));
  it("1767872928_1988", () => doTest("1767872928_1988"));
  it("1767872928_1994", () => doTest("1767872928_1994"));
  it("1767872928_2550", () => doTest("1767872928_2550"));
  it("1767872928_2891", () => doTest("1767872928_2891"));
  it("1767872928_3768", () => doTest("1767872928_3768"));
  it("1767872928_4149", () => doTest("1767872928_4149"));
  it("1767872928_4532", () => doTest("1767872928_4532"));
  it("1767872928_5186", () => doTest("1767872928_5186"));
  it("1767872928_5525", () => doTest("1767872928_5525"));
  it("1767872928_5974", () => doTest("1767872928_5974"));
  it("1767872928_6833", () => doTest("1767872928_6833"));
  it("1767872928_7649", () => doTest("1767872928_7649"));
  it("1767872928_7682", () => doTest("1767872928_7682"));
  it("1767872928_8840", () => doTest("1767872928_8840"));
  it("1767889897_1064", () => doTest("1767889897_1064"));
  it("1767889897_2748", () => doTest("1767889897_2748"));
  it("1767889897_2790", () => doTest("1767889897_2790"));
  it("1767889897_2906", () => doTest("1767889897_2906"));
  it("1767889897_2969", () => doTest("1767889897_2969"));
  it("1767889897_3840", () => doTest("1767889897_3840"));
  it("1767889897_4774", () => doTest("1767889897_4774"));
  it("1767889897_5284", () => doTest("1767889897_5284"));
  it("1767889897_5940", () => doTest("1767889897_5940"));
  it("1767889897_6429", () => doTest("1767889897_6429"));
  it("1767889897_7743", () => doTest("1767889897_7743"));
  it("1767889897_8025", () => doTest("1767889897_8025"));
  it("1767889897_8471", () => doTest("1767889897_8471"));
  it("1767889897_9359", () => doTest("1767889897_9359"));
  it("1767889897_9847", () => doTest("1767889897_9847"));
  it("1767891325_1291", () => doTest("1767891325_1291"));
  it("1767891325_4549", () => doTest("1767891325_4549"));
  it("1767891325_5123", () => doTest("1767891325_5123"));
  it("1767895984_1243", () => doTest("1767895984_1243"));
  it("1767895984_2203", () => doTest("1767895984_2203"));
  it("1767895984_2519", () => doTest("1767895984_2519"));
  it("1767895984_3469", () => doTest("1767895984_3469"));
  it("1767895984_3511", () => doTest("1767895984_3511"));
  it("1767895984_4076", () => doTest("1767895984_4076"));
  it("1767895984_4240", () => doTest("1767895984_4240"));
  it("1767895984_6921", () => doTest("1767895984_6921"));
  it("1767895984_7031", () => doTest("1767895984_7031"));
  it("1767895984_7154", () => doTest("1767895984_7154"));
  it("1767895984_7922", () => doTest("1767895984_7922"));
  it("1767895984_7948", () => doTest("1767895984_7948"));
  it("1767895984_8247", () => doTest("1767895984_8247"));
  it("1767895984_8315", () => doTest("1767895984_8315"));
  it("1767895984_8461", () => doTest("1767895984_8461"));
  it("1767895984_8741", () => doTest("1767895984_8741"));
  it("1767895984_9131", () => doTest("1767895984_9131"));
  it("1767896003_1048", () => doTest("1767896003_1048"));
  it("1767896003_1257", () => doTest("1767896003_1257"));
  it("1767896003_2013", () => doTest("1767896003_2013"));
  it("1767896003_2346", () => doTest("1767896003_2346"));
  it("1767896003_2541", () => doTest("1767896003_2541"));
  it("1767896003_3771", () => doTest("1767896003_3771"));
  it("1767896003_4464", () => doTest("1767896003_4464"));
  it("1767896003_4566", () => doTest("1767896003_4566"));
  it("1767896003_6043", () => doTest("1767896003_6043"));
  it("1767896003_6164", () => doTest("1767896003_6164"));
  it("1767896003_6570", () => doTest("1767896003_6570"));
  it("1767896003_7039", () => doTest("1767896003_7039"));
  it("1767896003_7099", () => doTest("1767896003_7099"));
  it("1767896003_7458", () => doTest("1767896003_7458"));
  it("1767896003_7482", () => doTest("1767896003_7482"));
  it("1767896003_7770", () => doTest("1767896003_7770"));
  it("1767896003_9191", () => doTest("1767896003_9191"));
  it("1767896003_9785", () => doTest("1767896003_9785"));
  it("1768066437_2547", () => doTest("1768066437_2547"));
  it("1768066437_3174", () => doTest("1768066437_3174"));
  it("1768066437_3920", () => doTest("1768066437_3920"));
  it("1768066437_6431", () => doTest("1768066437_6431"));
  it("1768066437_7150", () => doTest("1768066437_7150"));
  it("1768066437_9255", () => doTest("1768066437_9255"));
  it("1768067197_6472", () => doTest("1768067197_6472"));
  it("1768067359_9734", () => doTest("1768067359_9734"));
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
