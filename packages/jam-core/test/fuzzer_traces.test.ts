import {
  IdentityMap,
  IdentityMapCodec,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamSignedHeaderImpl,
  JamStateImpl,
  merkleStateMap,
  stateFromMerkleMap,
  stateKey,
} from "@/index";
import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  Uint8ArrayJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import fs from "fs";
import { diff } from "jest-diff";
import path from "path";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import type {
  StateKey,
  StateRootHash,
} from "../../jam-types/dist/types/generic-types";
import { getConstantsMode } from "@tsjam/constants";

describe.skipIf(getConstantsMode() == "full")("fuzzer_traces", () => {
  beforeAll(() => {
    process.env.RUNNING_TRACE_TESTS = "true";
  });
  afterAll(() => {
    process.env.RUNNING_TRACE_TESTS = "false";
  });
  const dir = `${__dirname}/../../../jam-conformance/fuzz-reports/0.7.0/traces/`;
  const doTest = (what: string) => {
    const traceDir = `${dir}${what}/`;
    const files = fs
      .readdirSync(traceDir)
      .filter((a) => a.endsWith(".bin"))
      .sort((a, b) => a.localeCompare(b));

    const initialTrace = loadTrace(
      fs.readFileSync(path.join(traceDir, files[0])),
    );

    // set initial block and initial state
    let jamState = stateFromMerkleMap(initialTrace.preState.merkleMap);
    jamState.block = new JamBlockImpl({
      header: new JamSignedHeaderImpl({}),
      extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
    });

    jamState.block!.header.signedHash = () => initialTrace.block.header.parent;

    // TODO: check merkleroot

    //files.splice(0, 1);
    for (const file of files) {
      console.log(file);
      const trace = loadTrace(fs.readFileSync(path.join(traceDir, file)));
      const res = jamState.applyBlock(trace.block);
      let newState: JamStateImpl = jamState;
      if (res.isErr()) {
        console.log("Error applying block", res.error);
      } else {
        newState = res.value;
      }
      if (
        Buffer.compare(newState.merkleRoot(), trace.postState.stateRoot) !== 0
      ) {
        console.log(
          "Expected merkle root:",
          Buffer.from(trace.postState.stateRoot).toString("hex"),
        );
        console.log(
          "Got merkle root:",
          Buffer.from(newState.merkleRoot()).toString("hex"),
        );
        const calculatedMap = merkleStateMap(newState);
        const expectedMap = trace.postState.merkleMap;
        const expectedState = stateFromMerkleMap(expectedMap);
        for (const [key, expectedValue] of expectedMap.entries()) {
          if (!calculatedMap.has(key)) {
            console.log(`Missing key ${key}`);
          } else if (
            Buffer.compare(calculatedMap.get(key)!, expectedValue) !== 0
          ) {
            reverseDifferentState(key, expectedState, newState);
          }
        }
        throw new Error("diff");
      }
      jamState = newState;
    }
  };
  it("1756548459", () => doTest("1756548459"));
  it("1756548583", () => doTest("1756548583"));
  it("1756548667", () => doTest("1756548667"));
  it("1756548706", () => doTest("1756548706"));
  it("1756548741", () => doTest("1756548741"));
  it("1756548767", () => doTest("1756548767"));
  it("1756548796", () => doTest("1756548796"));
  it("1756548916", () => doTest("1756548916"));
  it("1756572122", () => doTest("1756572122"));
  it("1756790723", () => doTest("1756790723"));
  it("1756791458", () => doTest("1756791458"));
  it("1756792661", () => doTest("1756792661"));
});

const reverseDifferentState = (
  key: StateKey,
  expected: JamStateImpl,
  actual: JamStateImpl,
) => {
  if (Buffer.compare(stateKey(1), key) === 0) {
    // authPool
    console.log(
      "authPool",
      diff(expected.authPool.toJSON(), actual.authPool.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(2), key) === 0) {
    // authQueue
    console.log(
      "authQueue",
      diff(expected.authQueue.toJSON(), actual.authQueue.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(3), key) === 0) {
    // beta
    console.log("beta", diff(expected.beta.toJSON(), actual.beta.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(4), key) === 0) {
    // safrole
    console.log(
      "safrole",
      diff(expected.safroleState.toJSON(), actual.safroleState.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(5), key) === 0) {
    // disputes
    console.log(
      "disputes",
      diff(expected.disputes.toJSON(), actual.disputes.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(6), key) === 0) {
    // entropy
    console.log(
      "entropy",
      diff(expected.entropy.toJSON(), actual.entropy.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(7), key) === 0) {
    // iota
    console.log("iota", diff(expected.iota.toJSON(), actual.iota.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(8), key) === 0) {
    // kappa
    console.log("kappa", diff(expected.kappa.toJSON(), actual.kappa.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(9), key) === 0) {
    // lambda
    console.log(
      "lambda",
      diff(expected.lambda.toJSON(), actual.lambda.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(10), key) === 0) {
    // rho
    console.log("rho", diff(expected.rho.toJSON(), actual.rho.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(11), key) === 0) {
    // slot
    console.log("slot", diff(expected.slot.toJSON(), actual.slot.toJSON()));
    return;
  } else if (Buffer.compare(stateKey(12), key) === 0) {
    // privServices
    console.log(
      "privServices",
      diff(expected.privServices.toJSON(), actual.privServices.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(13), key) === 0) {
    // statistics
    console.log(
      "statistics",
      diff(expected.statistics.toJSON(), actual.statistics.toJSON()),
    );
    return;
  } else if (Buffer.compare(stateKey(14), key) === 0) {
    // accumulation Queue
    console.log(
      "accumulationQueue",
      diff(
        expected.accumulationQueue.toJSON(),
        actual.accumulationQueue.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(15), key) === 0) {
    // accumulationHistory
    console.log(
      "accumulationHistory",
      diff(
        expected.accumulationHistory.toJSON(),
        actual.accumulationHistory.toJSON(),
      ),
    );
    return;
  } else if (Buffer.compare(stateKey(16), key) === 0) {
    //theta
    console.log(
      "theta",
      diff(
        expected.mostRecentAccumulationOutputs.toJSON(),
        actual.mostRecentAccumulationOutputs.toJSON(),
      ),
    );
    return;
  }

  for (const [serviceIndex, serviceAccount] of expected.serviceAccounts
    .elements) {
    if (Buffer.compare(stateKey(255, serviceIndex), key) === 0) {
      // its about this service
      //
      //
      console.log(
        `serviceAccount ${serviceIndex}`,
        diff(
          serviceAccount.toJSON(),
          actual.serviceAccounts.get(serviceIndex)?.toJSON() ?? {},
          {
            contextLines: 1,
            expand: false,
          },
        ),
      );
      return;
    }
  }

  // not handled probably only storage or preimage(s)
  console.log(key);
  const actualMap = merkleStateMap(actual);
  const expectedMap = merkleStateMap(expected);

  console.log(
    diff(
      Uint8ArrayJSONCodec.toJSON(expectedMap.get(key)!),
      Uint8ArrayJSONCodec.toJSON(actualMap.get(key)!),
    ),
  );
};

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
  merkleMap!: IdentityMap<StateKey, 31, Uint8Array>;

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

export const loadTrace = (bin: Uint8Array) => {
  const toRet = TraceStep.decode(bin);

  assert(
    toRet.readBytes === bin.length,
    `readBytes ${toRet.readBytes} !== bin.length ${bin.length}`,
  );
  assert(Buffer.compare(toRet.value.toBinary(), bin) === 0, "cannot re-encode");

  return toRet.value;
};
