import { DeltaImpl } from "@/classes/DeltaImpl";
import { JamStateImpl } from "@/classes/JamStateImpl";
import { MerkleServiceAccountStorageImpl } from "@/classes/MerkleServiceAccountStorageImpl";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { merkleStateMap, stateFromMerkleMap } from "@/merklization";
import { traceJSONCodec } from "@/merklization/stateCodecs";
import { Hashing } from "@tsjam/crypto";
import {
  Balance,
  CodeHash,
  Gas,
  Hash,
  JamState,
  ServiceIndex,
  Tagged,
  u32,
  UpToSeq,
} from "@tsjam/types";
import { beforeEach, describe, expect, it } from "vitest";
import { dummyState } from "../utils";
import { SlotImpl } from "@/classes/SlotImpl";
import { IdentityMap } from "@/data_structures/identityMap";

describe("state serialization/deserialization", () => {
  it("should deserializa to same object", () => {
    const state: JamStateImpl = dummyState();

    const map = merkleStateMap(state);
    const restoredState = stateFromMerkleMap(map);
    for (const key of Object.keys(state)) {
      expect(restoredState[key as keyof JamState], key).deep.eq(
        state[key as keyof JamState],
      );
    }
  });
  describe("serviceAccounts", () => {
    const serviceIndex1 = <ServiceIndex>20000;
    const serviceIndex2 = <ServiceIndex>30000;
    let acc: ServiceAccountImpl;
    let acc2: ServiceAccountImpl;
    beforeEach(() => {
      acc = new ServiceAccountImpl({
        storage: new MerkleServiceAccountStorageImpl(serviceIndex1),
        balance: <Balance>11n,
        codeHash: <CodeHash>(<Hash>Hashing.blake2b(new Uint8Array([12]))),
        minAccGas: <Gas>13n,
        minMemoGas: <Gas>14n,
        gratis: <Balance>15n,
        created: new SlotImpl(<u32>16),
        lastAcc: new SlotImpl(<u32>17),
        parent: <ServiceIndex>18,
        requests: new IdentityMap(),
        preimages: new IdentityMap(),
      });
      const preimage = Buffer.from("veke", "utf8");
      const preimageHash = Hashing.blake2b(preimage);

      acc2 = new ServiceAccountImpl({
        storage: new MerkleServiceAccountStorageImpl(serviceIndex2),
        balance: <Balance>21n,
        codeHash: <CodeHash>(<Hash>Hashing.blake2b(new Uint8Array([12]))),
        minAccGas: <Gas>23n,
        minMemoGas: <Gas>24n,
        gratis: <Balance>25n,
        created: new SlotImpl(<u32>26),
        lastAcc: new SlotImpl(<u32>27),
        parent: <ServiceIndex>28,
        requests: new IdentityMap([
          [
            preimageHash,
            new Map<Tagged<u32, "length">, UpToSeq<SlotImpl, 3>>([
              [
                <Tagged<u32, "length">>4,
                <UpToSeq<SlotImpl, 3>>[
                  new SlotImpl(<u32>1),
                  new SlotImpl(<u32>2),
                  new SlotImpl(<u32>3),
                ],
              ],
            ]),
          ],
        ]),
        preimages: new IdentityMap([[preimageHash, preimage]]),
      });

      acc.storage.set(new Uint8Array([1, 2]), new Uint8Array([4, 5]));
      acc.storage.set(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]));
      acc2.storage.set(
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([4, 5, 6, 7]),
      );
    });
    it("should work with one acc", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(new Map([[serviceIndex1, acc]]));
      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
    it("should work with two accs", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(
        new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      );

      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
    it("should restore from trace", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(
        new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      );

      const map = merkleStateMap(state);
      const json = traceJSONCodec.toJSON(map);
      const restoredMap = traceJSONCodec.fromJSON(json);
      const json2 = traceJSONCodec.toJSON(restoredMap);

      expect(json).to.deep.eq(json2);
    });
    it("should work with preimages", () => {
      const state = dummyState();
      state.serviceAccounts = new DeltaImpl(new Map([[serviceIndex2, acc2]]));
      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
  });
});
