import {
  HeaderLookupHistoryImpl,
  IdentityMap,
  IdentityMapCodec,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamSignedHeaderImpl,
  merkleStateMap,
  stateFromMerkleMap,
} from "@/index";
import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import type { MerkleTreeRoot, StateKey } from "@tsjam/types";
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
  merkleMap!: IdentityMap<StateKey, 31, Uint8Array>;
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
const decodeTrace = (kind: string, which: string): TracesTestCase => {
  const data = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/traces/${kind}/${which}.json`,
    "utf8",
  );
  return TracesTestCase.fromJSON(JSON.parse(data));
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

export const buildTracesTests = (kind: string) => {
  const cases = tracesList(kind);
  const buildHeaderLookupHistory = (index: number): HeaderLookupHistoryImpl => {
    if (index === 0) {
      const hlh = HeaderLookupHistoryImpl.newEmpty();
      const genesis = tracesTestCase(kind, "00000001").parentBlock;
      hlh.elements.set(genesis.header.slot, genesis.header);
      return hlh;
    } else {
      const hlh = buildHeaderLookupHistory(index - 1);
      const testCase = tracesTestCase(kind, index.toString().padStart(8, "0"));
      return hlh.toPosterior({ header: testCase.block.header });
    }
  };
  for (const which of cases) {
    it(`${which}`, () => {
      const testCase = tracesTestCase(kind, which);
      const initialState = stateFromMerkleMap(testCase.preState.merkleMap);

      initialState.headerLookupHistory = buildHeaderLookupHistory(
        parseInt(which) - 1,
      );

      expect(
        xBytesCodec(32).toJSON(initialState.merkleRoot()),
        "initial state root",
      ).eq(xBytesCodec(32).toJSON(testCase.preState.stateRoot));

      initialState.block = testCase.parentBlock;
      initialState.headerLookupHistory.elements.set(
        testCase.parentBlock.header.slot,
        testCase.parentBlock.header,
      );

      const [err, posteriorState] = initialState
        .applyBlock(testCase.block)
        .safeRet();
      if (err) {
        throw err;
      }

      const merkleMap = merkleStateMap(posteriorState);
      const staMM = stateFromMerkleMap(merkleMap);

      expect(staMM.statistics.toJSON()).deep.eq(
        stateFromMerkleMap(testCase.postState.merkleMap).statistics.toJSON(),
      );
      const doubleMerkleMap = merkleStateMap(staMM);

      // sanity check
      const codec = TraceTestState.codecOf("merkleMap");
      expect(
        codec.toJSON(doubleMerkleMap),
        "state was codecable and decodable",
      ).deep.eq(codec.toJSON(merkleMap));

      for (const [k, v] of merkleMap.entries()) {
        expect(
          testCase.postState.merkleMap.has(k),
          "key missing in post state",
        ).toBe(true);
        expect(
          LengthDiscrimantedIdentityCodec.toJSON(v),
          `key = ${LengthDiscrimantedIdentityCodec.toJSON(k)}`,
        ).toEqual(
          LengthDiscrimantedIdentityCodec.toJSON(
            testCase.postState.merkleMap.get(k)!,
          ),
        );
      }
      expect(merkleMap.size).eq(testCase.postState.merkleMap.size);
      expect(xBytesCodec(32).toJSON(posteriorState.merkleRoot())).eq(
        xBytesCodec(32).toJSON(testCase.postState.stateRoot),
      );
    });
  }
};
