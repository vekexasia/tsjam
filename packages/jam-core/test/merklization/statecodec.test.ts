import { MerkleServiceAccountStorageImpl } from "@/merkleServiceAccountStorage";
import { merkleStateMap, stateFromMerkleMap } from "@/state";
import { traceJSONCodec } from "@/stateCodecs";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";
import {
  CodeHash,
  Gas,
  JamState,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  u64,
  UpToSeq,
  u32,
  Balance,
} from "@tsjam/types";
import { dummyState } from "@tsjam/utils/test/utils.js";
import { beforeEach, describe, expect, it } from "vitest";

describe("state serialization/deserialization", () => {
  it("should deserializa to same object", () => {
    const state: JamState = dummyState({
      cores: CORES,
      validators: NUMBER_OF_VALIDATORS,
      epoch: EPOCH_LENGTH,
    });

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
    let acc: ServiceAccount;
    let acc2: ServiceAccount;
    beforeEach(() => {
      acc = new ServiceAccountImpl({
        storage: new MerkleServiceAccountStorageImpl(serviceIndex1),
        balance: <Balance>11n,
        codeHash: <CodeHash>12n,
        minAccGas: <Gas>13n,
        minMemoGas: <Gas>14n,
        gratis: <Balance>15n,
        created: <Tau>16,
        lastAcc: <Tau>17,
        parent: <ServiceIndex>18,
        requests: new Map(),
        preimages: new Map(),
      });
      const preimage = Buffer.from("veke", "utf8");
      const preimageHash = Hashing.blake2b(preimage);

      acc2 = new ServiceAccountImpl({
        storage: new MerkleServiceAccountStorageImpl(serviceIndex2),
        balance: <Balance>21n,
        codeHash: <CodeHash>22n,
        minAccGas: <Gas>23n,
        minMemoGas: <Gas>24n,
        gratis: <Balance>25n,
        created: <Tau>26,
        lastAcc: <Tau>27,
        parent: <ServiceIndex>28,
        requests: new Map([
          [
            preimageHash,
            new Map<Tagged<u32, "length">, UpToSeq<Tau, 3>>([
              [<Tagged<u32, "length">>4, <UpToSeq<Tau, 3>>[1, 2, 3]],
            ]),
          ],
        ]),
        preimages: new Map([[preimageHash, preimage]]),
      });

      acc.storage.set(new Uint8Array([1, 2]), new Uint8Array([4, 5]));
      acc.storage.set(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]));
      acc2.storage.set(
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([4, 5, 6, 7]),
      );
    });
    it("should work with one acc", () => {
      const state: JamState = {
        ...dummyState({
          cores: CORES,
          validators: NUMBER_OF_VALIDATORS,
          epoch: EPOCH_LENGTH,
        }),
        serviceAccounts: new Map([[serviceIndex1, acc]]),
      };
      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
    it("should work with two accs", () => {
      const state: JamState = {
        ...dummyState({
          cores: CORES,
          validators: NUMBER_OF_VALIDATORS,
          epoch: EPOCH_LENGTH,
        }),
        serviceAccounts: new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      };

      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
    it("should restore from trace", () => {
      const state: JamState = {
        ...dummyState({
          cores: CORES,
          validators: NUMBER_OF_VALIDATORS,
          epoch: EPOCH_LENGTH,
        }),
        serviceAccounts: new Map([
          [serviceIndex1, acc],
          [serviceIndex2, acc2],
        ]),
      };

      const map = merkleStateMap(state);
      const json = traceJSONCodec.toJSON(map);
      const restoredMap = traceJSONCodec.fromJSON(json);
      const json2 = traceJSONCodec.toJSON(restoredMap);

      expect(json).to.deep.eq(json2);
    });
    it("should work with preimages", () => {
      const state: JamState = {
        ...dummyState({
          cores: CORES,
          validators: NUMBER_OF_VALIDATORS,
          epoch: EPOCH_LENGTH,
        }),
        serviceAccounts: new Map([[serviceIndex2, acc2]]),
      };
      const map = merkleStateMap(state);
      const restoredState = stateFromMerkleMap(map);
      expect(restoredState.serviceAccounts).to.deep.eq(state.serviceAccounts);
    });
  });
});
