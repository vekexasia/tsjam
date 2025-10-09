import { IdentityMap } from "@/data-structures/identity-map";
import { DeltaImpl } from "@/impls/delta-impl";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl } from "@/impls/slot-impl";
import { MerkleServiceAccountStorageImpl } from "@/index";
import { traceJSONCodec } from "@/merklization/state-codecs";
import { Hashing } from "@tsjam/crypto";
import {
  Balance,
  CodeHash,
  Gas,
  Hash,
  ServiceIndex,
  u32,
  UpToSeq,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { dummyState } from "../dummy-utils";

describe("state serialization/deserialization", () => {
  describe("serviceAccounts", () => {
    const serviceIndex1 = <ServiceIndex>20000;
    const serviceIndex2 = <ServiceIndex>30000;
    let acc: ServiceAccountImpl;
    let acc2: ServiceAccountImpl;
    beforeEach(() => {
      acc = new ServiceAccountImpl(
        {
          version: 0,
          balance: <Balance>11n,
          codeHash: <CodeHash>(<Hash>Hashing.blake2b(Buffer.from([12]))),
          minAccGas: <Gas>13n,
          minMemoGas: <Gas>14n,
          gratis: <Balance>15n,
          created: new SlotImpl(<u32>16),
          lastAcc: new SlotImpl(<u32>17),
          parent: <ServiceIndex>18,
          preimages: new IdentityMap(),
        },
        new MerkleServiceAccountStorageImpl(serviceIndex1),
      );
      const preimage = Buffer.from("veke", "utf8");
      const preimageHash = Hashing.blake2b(preimage);

      acc2 = new ServiceAccountImpl(
        {
          version: 0,
          balance: <Balance>21n,
          codeHash: <CodeHash>(<Hash>Hashing.blake2b(Buffer.from([12]))),
          minAccGas: <Gas>23n,
          minMemoGas: <Gas>24n,
          gratis: <Balance>25n,
          created: new SlotImpl(<u32>26),
          lastAcc: new SlotImpl(<u32>27),
          parent: <ServiceIndex>28,
          preimages: new IdentityMap([[preimageHash, preimage]]),
        },
        new MerkleServiceAccountStorageImpl(serviceIndex2),
      );

      acc2.requests.set(preimageHash, toTagged(4), <UpToSeq<SlotImpl, 3>>[
        new SlotImpl(<u32>1),
        new SlotImpl(<u32>2),
        new SlotImpl(<u32>3),
      ]);

      acc.storage.set(Buffer.from([1, 2]), Buffer.from([4, 5]));
      acc.storage.set(Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6]));
      acc2.storage.set(Buffer.from([1, 2, 3, 4]), Buffer.from([4, 5, 6, 7]));
    });
    it("should work with one acc", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(new Map([[serviceIndex1, acc]]));
      const map = state.merkle.map;
      const restoredState = JamStateImpl.fromMerkleMap(map);
      for (const [serviceIndex, original] of state.serviceAccounts.elements) {
        expect(restoredState.serviceAccounts.has(serviceIndex)).toBe(true);
        const sa = restoredState.serviceAccounts.get(serviceIndex)!;
        expect(sa.balance).deep.eq(original.balance);
        expect(sa.codeHash).deep.eq(original.codeHash);
        expect(sa.minAccGas).deep.eq(original.minAccGas);
        expect(sa.minMemoGas).deep.eq(original.minMemoGas);
        expect(sa.gratis).deep.eq(original.gratis);
        expect(sa.created).deep.eq(original.created);
        expect(sa.lastAcc).deep.eq(original.lastAcc);
        expect(sa.parent).eq(original.parent);
        expect(sa.preimages).deep.eq(original.preimages);
        expect(sa.merkleStorage).deep.eq(original.merkleStorage);
      }
    });
    it("should work with two accs", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(
        new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      );

      const map = state.merkle.map;
      const restoredState = JamStateImpl.fromMerkleMap(map);
      for (const [serviceIndex, original] of state.serviceAccounts.elements) {
        expect(restoredState.serviceAccounts.has(serviceIndex)).toBe(true);
        const sa = restoredState.serviceAccounts.get(serviceIndex)!;
        expect(sa.balance).deep.eq(original.balance);
        expect(sa.codeHash).deep.eq(original.codeHash);
        expect(sa.minAccGas).deep.eq(original.minAccGas);
        expect(sa.minMemoGas).deep.eq(original.minMemoGas);
        expect(sa.gratis).deep.eq(original.gratis);
        expect(sa.created).deep.eq(original.created);
        expect(sa.lastAcc).deep.eq(original.lastAcc);
        expect(sa.parent).eq(original.parent);
        expect(sa.preimages).deep.eq(original.preimages);
        expect(sa.merkleStorage).deep.eq(original.merkleStorage);
      }
    });
    it("should restore from trace", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(
        new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      );

      const map = state.merkle.map;
      const json = traceJSONCodec.toJSON(map);
      const restoredMap = traceJSONCodec.fromJSON(json);
      const json2 = traceJSONCodec.toJSON(restoredMap);

      expect(json).to.deep.eq(json2);
    });
  });
});
