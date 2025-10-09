import {
  AppliedBlock,
  ChainManager,
  HeaderLookupHistoryImpl,
  IdentityMap,
  IdentityMapCodec,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamSignedHeaderImpl,
  JamStateImpl,
} from "@/index";
import {
  BaseJamCodecable,
  BufferJSONCodec,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import type {
  Hash,
  MerkleTreeRoot,
  ServiceIndex,
  StateKey,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import fs from "fs";
import { expect, it } from "vitest";

@JamCodecable()
export class TraceTestState extends BaseJamCodecable {
  @codec(xBytesCodec(32), "state_root")
  stateRoot!: MerkleTreeRoot;

  @codec(
    IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
      key: "key",
      value: "value",
    }),
    "keyvals",
  )
  merkleMap!: IdentityMap<StateKey, 31, Buffer>;
}

@JamCodecable()
export class TracesTestCase extends BaseJamCodecable {
  @codec(TraceTestState, "pre_state")
  preState!: TraceTestState;

  @codec(JamBlockImpl, "block")
  block!: JamBlockImpl;

  @codec(TraceTestState, "post_state")
  postState!: TraceTestState;

  /**
   * set using the prev trace
   */
  parentBlock!: JamBlockImpl;
}

@JamCodecable()
export class TracesGenesis extends BaseJamCodecable {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(TraceTestState)
  state!: TraceTestState;
}

const decodeBin = (kind: string, which: string): TracesTestCase => {
  const data = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/traces/${kind}/${which}.bin`,
  );
  return TracesTestCase.decode(data).value;
};

export const tracesTestCase = (kind: string, which: string) => {
  const trace = decodeBin(kind, which);

  if (which === "00000001") {
    trace.parentBlock = new JamBlockImpl({
      header: TracesGenesis.fromJSON(
        JSON.parse(
          fs.readFileSync(
            `${__dirname}/../../../../jamtestvectors/traces/${kind}/genesis.json`,
            "utf8",
          ),
        ),
      ).header,
      extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
    });
  } else {
    const prevTrace = decodeBin(
      kind,
      (parseInt(which) - 1).toString().padStart(8, "0"),
    );
    trace.parentBlock = prevTrace.block;
  }
  return trace;
};

export const tracesList = (kind: string) => {
  const path = `${__dirname}/../../../../jamtestvectors/traces/${kind}`;
  const dir = fs.readdirSync(path);
  return dir
    .filter((file) => file.endsWith(".json"))
    .filter((file) => file !== "genesis.json")
    .map((file) => file.replace(/\.json$/, ""));
};

export const buildHeaderLookupHistory = (
  kind: string,
  index: number,
): HeaderLookupHistoryImpl => {
  if (index === 0) {
    const hlh = HeaderLookupHistoryImpl.newEmpty();
    const genesis = tracesTestCase(kind, "00000001").parentBlock;
    hlh.elements.set(genesis.header.slot, genesis.header.signedHash());
    return hlh;
  } else {
    const hlh = buildHeaderLookupHistory(kind, index - 1);
    const testCase = tracesTestCase(kind, index.toString().padStart(8, "0"));
    return hlh.toPosterior(testCase.block.header);
  }
};

export const buildTracesTests = (kind: string) => {
  const cases = tracesList(kind);

  for (const which of cases) {
    it(`${which}`, async () => {
      const testCase = tracesTestCase(kind, which);

      testCase.parentBlock.posteriorState = JamStateImpl.fromMerkleMap(
        testCase.preState.merkleMap,
      );
      testCase.parentBlock.posteriorState.headerLookupHistory =
        buildHeaderLookupHistory(kind, parseInt(which) - 1);
      testCase.parentBlock.posteriorState.headerLookupHistory.elements.set(
        testCase.parentBlock.header.slot,
        testCase.parentBlock.header.signedHash(),
      );
      const chainManager = await ChainManager.build(
        <AppliedBlock>testCase.parentBlock,
      );

      expect(
        xBytesCodec(32).toJSON(
          chainManager.bestBlock.posteriorState.merkleRoot(),
        ),
        "initial state root",
      ).eq(xBytesCodec(32).toJSON(testCase.preState.stateRoot));

      const [err, appliedBlock] = (
        await chainManager.handleIncomingBlock(testCase.block)
      ).safeRet();
      if (typeof err !== "undefined") {
        throw err;
      }

      const posteriorState = appliedBlock.posteriorState;
      const merkleMap = posteriorState.merkle.map;
      const staMM = JamStateImpl.fromMerkleMap(merkleMap);

      expect(staMM.statistics.toJSON()).deep.eq(
        JamStateImpl.fromMerkleMap(
          testCase.postState.merkleMap,
        ).statistics.toJSON(),
      );
      const doubleMerkleMap = staMM.merkle.map;

      // sanity check
      const codec = TraceTestState.codecOf("merkleMap");
      expect(
        codec.toJSON(doubleMerkleMap),
        "state was codecable and decodable",
      ).deep.eq(codec.toJSON(merkleMap));

      for (const [k, v] of merkleMap.entries()) {
        expect(
          testCase.postState.merkleMap.has(k),
          "key missing in test post state",
        ).toBe(true);
        expect(v).deep.eq(testCase.postState.merkleMap.get(k));
      }
      for (const [k] of testCase.postState.merkleMap.entries()) {
        expect(
          merkleMap.has(k),
          `key ${k.toString("hex")} missing in our postState`,
        ).toBe(true);
      }

      expect(merkleMap.size).eq(testCase.postState.merkleMap.size);
      expect(xBytesCodec(32).toJSON(posteriorState.merkleRoot())).eq(
        xBytesCodec(32).toJSON(testCase.postState.stateRoot),
      );
    });
  }
};
