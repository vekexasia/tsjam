import { HashCodec } from "@/codecs/misc-codecs";
import { IdentityMap, IdentityMapCodec } from "@/data-structures/identity-map";
import { AccumulationStatisticsImpl } from "@/impls/accumulation-statistics-impl";
import { DeltaImpl } from "@/impls/delta-impl";
import { PreimagesExtrinsicImpl } from "@/impls/extrinsics/preimages";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { ServicesStatisticsImpl } from "@/impls/services-statistics-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  codec,
  createArrayLengthDiscriminator,
  E_sub_int,
  eSubIntCodec,
  JamCodecable,
  jsonCodec,
  LengthDiscrimantedIdentityCodec,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import type {
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
import { TestOutputCodec } from "../codec-utils";
import { dummyState } from "../utils";
import { MerkleServiceAccountStorageImpl } from "@/index";

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
    IdentityMapCodec(HashCodec, LengthDiscrimantedIdentityCodec, {
      key: "hash",
      value: "blob",
    }),
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
    `${__dirname}/../../../../jamtestvectors/stf/preimages/${getConstantsMode()}/${filename}.json`,
    "utf-8",
  );
  const testCase = TestCase.fromJSON(JSON.parse(testJSON));
  const serviceAccounts = dummyState().serviceAccounts;

  [...testCase.preState.accounts.entries()].map(
    ([serviceIndex, testAccount]) => {
      const storage = new MerkleServiceAccountStorageImpl(serviceIndex);
      [...testAccount.lookup.entries()].map(([key, value]) => {
        storage.requests.set(key.hash, key.length, toTagged(value));
      });

      serviceAccounts.set(
        serviceIndex,

        new ServiceAccountImpl(
          <any>{
            preimages: testAccount.preimages,
          },
          storage,
        ),
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
  for (const [serviceIndex, postTestAccount] of testCase.postState.accounts) {
    const serviceAccount = posterior_delta.get(serviceIndex)!;
    for (const preimageKey of postTestAccount.preimages.keys()) {
      const blob = serviceAccount.preimages.get(preimageKey);
      expect(blob).deep.eq(postTestAccount.preimages.get(preimageKey)!);
    }

    for (const [lookupMetaKey, slots] of postTestAccount.lookup.entries()) {
      const lookupMeta = serviceAccount.requests.get(
        lookupMetaKey.hash,
        lookupMetaKey.length,
      )!;
      expect(lookupMeta).toBeDefined();

      expect(lookupMeta.length).toBe(slots.length);
      for (let i = 0; i < slots.length; i++) {
        expect(lookupMeta[i]).toEqual(slots[i]);
      }
    }
  }

  // checks statistics
  const p_stats = testCase.preState.statistics.toPosterior({
    ep: r.value,
    accumulationStatistics: new AccumulationStatisticsImpl(),
    transferStatistics: new Map(),
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
