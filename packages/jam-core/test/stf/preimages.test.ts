import { DeltaImpl } from "@/classes/DeltaImpl";
import { PreimagesExtrinsicImpl } from "@/classes/extrinsics/preimages";
import { ServicesStatisticsImpl } from "@/classes/ServicesStatisticsImpl";
import { SlotImpl } from "@/classes/SlotImpl";
import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  buildGenericKeyValueCodec,
  codec,
  E_sub_int,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
  MapJSONCodec,
  NumberJSONCodec,
  WrapJSONCodec,
} from "@tsjam/codec";
import { DoubleDagger, Hash, Posterior, ServiceIndex, Tau, u32 } from "@tsjam/types";
import { describe, it } from "vitest";
import { ServiceInfo, TestOutputCodec } from "../codec_utils";
import { dummyState } from "../utils";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { IdentityMap, IdentityMapCodec, identitySetCodec } from "@/data_structures/identityMap";
import { HashCodec, xBytesCodec } from "@/codecs/miscCodecs";

class LookupMetaMapKey extends BaseJamCodecable {
  hash!: Hash;
  length!: u32
}
class TestAccount extends BaseJamCodecable {
  @codec(IdentityMapCodec(HashCodec, {...LengthDiscrimantedIdentity, ...BufferJSONCodec()}, {
    key: "hash",
    value: "blob",
  }))
  preimages!: ServiceAccountImpl["preimages"];

  
  lookup: Map<LookupMetaMapKey, SlotImpl[]>
}
 
@JamCodecable()
class TestState extends BaseJamCodecable {
  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "data" },
      NumberJSONCodec(),
      WrapJSONCodec("service", ServiceInfo),
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(E_sub_int(4), ServiceInfo, (a, b) => a - b),
  )
  accounts!: Map<ServiceIndex, TestAccount>;
  @codec(ServicesStatisticsImpl)
  statistics!: ServicesStatisticsImpl;
}

@JamCodecable()
class Input extends BaseJamCodecable {
  @codec(PreimagesExtrinsicImpl)
  preimages!: PreimagesExtrinsicImpl;

  @codec(SlotImpl, "slot")
  p_tau!: Posterior<Tau>;
}

@JamCodecable()
class TestCase extends BaseJamCodecable {
  @codec(Input)
  input!: Input;

  @codec(TestState, "pre_state")
  preState!: TestState;

  @codec(
    TestOutputCodec({
      decode() {
        return { value: null, readBytes: 0 };
      },
      encode() {
        return 0;
      },
      encodedSize() {
        return 0;
      },
      fromJSON(json) {
        return json;
      },
      toJSON(value) {
        return value;
      },
    }),
  )
  output!: { ok?: null; err?: number };

  @codec(TestState, "post_state")
  postState!: TestState;
}
const buildTest = (filename: string) => {
  const testJSON = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/preimages/data/${filename}.json`,
    "utf-8",
  );
  const testCase = TestCase.fromJSON(JSON.parse(testJSON));
  const serviceAccounts = dummyState().serviceAccounts;

  [...testCase.preState.accounts.entries()].map(
    ([serviceIndex, serviceInfo]) => {
      serviceAccounts.set(
        serviceIndex,
        serviceInfo.toServiceAccount(serviceIndex),
      );
    },
  );
  const r = testCase.input.preimages.checkValidity({
    serviceAccounts: serviceAccounts,
  });
  if (typeof testCase.output.err !== "undefined" && r.isOk()) {
    throw new Error(
      `Expected error ${testCase.output.err} but got ok: ${r.value}`,
    );
  } else if (typeof testCase.output.ok !== "undefined" && r.isErr()) {
    throw new Error(`Expected ok but got error: ${r.error}`);
  }

  if (r.isErr()) {
    return;
  }
  // we check the outputs
  //
  testCase.preState.statistics.

  // const decoded = createCodec<TestCase>([
  //   [
  //     "input",
  //     createCodec<Input>([
  //       ["ep", codec_Ep],
  //       ["p_tau", posteriorCodec(E_sub_int<Tau>(4))],
  //     ]),
  //   ],
  //   ["preState", stateCodec],
  //   [
  //     "output",
  //     eitherOneOfCodec<TestCase["output"]>([
  //       ["ok", createCodec<{}>([])],
  //       ["err", E_sub_int<number>(1)],
  //     ]),
  //   ],
  //   ["postState", stateCodec],
  // ]).decode(testBin).value;
  // const { input, preState, output, postState } = decoded;
  // throw new Error("bring me in core");
  // //  const [err, p_delta] = deltaToPosterior(
  // //    {
  // //      p_tau: input.p_tau,
  // //      EP_Extrinsic: toTagged(input.ep),
  // //      delta: preState.accounts,
  // //    },
  // //    preState.accounts,
  // //  ).safeRet();
  // //  if (typeof err !== "undefined") {
  // //    const ourErr = [
  // //      DeltaToPosteriorError.PREIMAGE_PROVIDED_OR_UNSOLICITED,
  // //      DeltaToPosteriorError.PREIMAGES_NOT_SORTED,
  // //    ][output.err!];
  // //
  // //    expect(err).toEqual(ourErr);
  // //    return;
  // //  }
  // //
  // //  expect([...p_delta.entries()]).deep.eq([...postState.accounts]);
  // //
  // //  const [, p_serviseStats] = serviceStatisticsSTF(
  // //    {
  // //      guaranteedReports: [],
  // //      preimages: input.ep,
  // //      accumulationStatistics: new Map(),
  // //      transferStatistics: new Map(),
  // //    },
  // //    preState.statistics,
  // //  ).safeRet();
  // //
  // //  expect([...p_serviseStats.entries()]).deep.eq([
  // //    ...postState.statistics.entries(),
  // //  ]);
};
describe.skip("preimages-test-vectors", () => {
  describe("tiny", () => {
    const test = (name: string) => buildTest(name);

    it("preimage_needed-1", () => test("preimage_needed-1"));
    it("preimage_needed-2", () => test("preimage_needed-2"));
    it("preimage_not_needed-1", () => test("preimage_not_needed-1"));
    it("preimage_not_needed-2", () => test("preimage_not_needed-2"));
    it("preimages_order_check-1", () => test("preimages_order_check-1"));
    it("preimages_order_check-2", () => test("preimages_order_check-2"));
    it("preimages_order_check-3", () => test("preimages_order_check-3"));
    it("preimages_order_check-4", () => test("preimages_order_check-4"));
  });
});
