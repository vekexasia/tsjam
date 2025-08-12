import { DeltaImpl } from "@/classes/DeltaImpl";
import { PreimagesExtrinsicImpl } from "@/classes/extrinsics/preimages";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { ServicesStatisticsImpl } from "@/classes/ServicesStatisticsImpl";
import { SlotImpl, TauImpl } from "@/classes/SlotImpl";
import { HashCodec } from "@/codecs/miscCodecs";
import { IdentityMap, IdentityMapCodec } from "@/data_structures/identityMap";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  buildGenericKeyValueCodec,
  codec,
  createArrayLengthDiscriminator,
  E_sub_int,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentity,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import {
  DoubleDagger,
  Hash,
  Posterior,
  ServiceIndex,
  Tagged,
  u32,
  Validated,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import fs from "fs";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "../codec_utils";
import { dummyState } from "../utils";
import { AccumulationStatisticsImpl } from "@/classes/AccumulationStatisticsImpl";

@JamCodecable()
class LookupMetaMapKey extends BaseJamCodecable {
  @codec(HashCodec)
  hash!: Hash;
  @eSubIntCodec(4)
  length!: Tagged<u32, "length">;
}
@JamCodecable()
class TestAccount extends BaseJamCodecable {
  @codec(
    IdentityMapCodec(
      HashCodec,
      { ...LengthDiscrimantedIdentity, ...BufferJSONCodec() },
      {
        key: "hash",
        value: "blob",
      },
    ),
  )
  preimages!: ServiceAccountImpl["preimages"];

  @jsonCodec(
    MapJSONCodec(
      { key: "key", value: "value" },
      LookupMetaMapKey,
      ArrayOfJSONCodec(SlotImpl),
    ),
    "lookup_meta",
  )
  @binaryCodec(
    buildGenericKeyValueCodec(
      LookupMetaMapKey,
      createArrayLengthDiscriminator(SlotImpl),
      () => 0,
    ),
  )
  lookup!: Map<LookupMetaMapKey, SlotImpl[]>;
}

@JamCodecable()
class TestState extends BaseJamCodecable {
  @jsonCodec(
    MapJSONCodec({ key: "id", value: "data" }, NumberJSONCodec(), TestAccount),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(E_sub_int(4), TestAccount, (a, b) => a - b),
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
  p_tau!: Validated<Posterior<TauImpl>>;
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
    `${__dirname}/../../../../jamtestvectors/stf/preimages/full/${filename}.json`,
    "utf-8",
  );
  const testCase = TestCase.fromJSON(JSON.parse(testJSON));
  const serviceAccounts = dummyState().serviceAccounts;

  [...testCase.preState.accounts.entries()].map(
    ([serviceIndex, testAccount]) => {
      const buildRequests: ServiceAccountImpl["requests"] = new IdentityMap();
      [...testAccount.lookup.entries()].map(([key, value]) => {
        if (!buildRequests.has(key.hash)) {
          buildRequests.set(key.hash, new Map());
        }
        const br = buildRequests.get(key.hash)!;
        br.set(toTagged(key.length), toTagged(value));
      });

      serviceAccounts.set(
        serviceIndex,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new ServiceAccountImpl(<any>{
          preimages: testAccount.preimages,
          requests: buildRequests,
        }),
      );
    },
  );

  const r = testCase.input.preimages.checkValidity({
    serviceAccounts: serviceAccounts,
  });

  if (r.isErr()) {
    if (typeof testCase.output.err !== "undefined") {
      return;
    }
    throw new Error(r.error);
  } else if (r.isOk() && typeof testCase.output.err !== "undefined") {
    throw new Error(
      `Expected error ${testCase.output.err} but got ok: ${r.value}`,
    );
  }

  const posterior_delta = (<DoubleDagger<DeltaImpl>>(
    serviceAccounts
  )).toPosterior({
    ep: r.value,
    p_tau: testCase.input.p_tau,
  });

  // check preimages and requests
  for (const [serviceIndex, testAccount] of testCase.postState.accounts) {
    const serviceAccount = posterior_delta.get(serviceIndex)!;
    for (const preimageKey of testAccount.preimages.keys()) {
      const blob = serviceAccount.preimages.get(preimageKey);
      expect(blob).deep.eq(testAccount.preimages.get(preimageKey)!);
    }

    for (const [lookupMetaKey, slots] of testAccount.lookup.entries()) {
      const lookupMeta = serviceAccount.requests.get(lookupMetaKey.hash)!;
      expect(lookupMeta).toBeDefined();
      expect(lookupMeta.get(lookupMetaKey.length)).toBeDefined();

      const computedSlots = lookupMeta.get(lookupMetaKey.length)!;

      expect(computedSlots!.length).toBe(slots.length);
      for (let i = 0; i < slots.length; i++) {
        expect(computedSlots![i]).toEqual(slots[i]);
      }
    }
  }

  // checks statistics
  const p_stats = testCase.preState.statistics.toPosterior({
    ep: r.value,
    accumulationStatistics: new AccumulationStatisticsImpl(),
    guaranteedReports: toTagged([]),
  });
  expect(p_stats !== testCase.postState.statistics).toBeTruthy();

  expect(testCase.postState.statistics).deep.eq(p_stats);
};
describe("preimages-test-vectors", () => {
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
