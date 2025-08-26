import { IdentityMap } from "@/data-structures/identity-map";
import { SafeMap } from "@/data-structures/safe-map";
import { AccumulationHistoryImpl } from "@/impls/accumulation-history-impl";
import { AccumulationQueueImpl } from "@/impls/accumulation-queue-impl";
import { AuthorizerPoolImpl } from "@/impls/authorizer-pool-impl";
import { AuthorizerQueueImpl } from "@/impls/authorizer-queue-impl";
import { BetaImpl } from "@/impls/beta-impl";
import { DeltaImpl } from "@/impls/delta-impl";
import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import { HeaderLookupHistoryImpl } from "@/impls/header-lookup-history-impl";
import { JamEntropyImpl } from "@/impls/jam-entropy-impl";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { JamStatisticsImpl } from "@/impls/jam-statistics-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { LastAccOutsImpl } from "@/impls/last-acc-outs-impl";
import { MerkleServiceAccountStorageImpl } from "@/impls/merkle-account-data-storage-impl";
import { PrivilegedServicesImpl } from "@/impls/privileged-services-impl";
import { RHOImpl } from "@/impls/rho-impl";
import { SafroleStateImpl } from "@/impls/safrole-state-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import { ValidatorsImpl } from "@/impls/validators-impl";
import { log } from "@/utils";
import { E_4_int, E_sub_int, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Gas, ServiceIndex, StateKey, u16, u32, u64 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { serviceAccountDataCodec } from "./state-codecs";
import { stateKey } from "./utils";

export const stateFromMerkleMap = (
  merkleMap: IdentityMap<StateKey, 31, Uint8Array>,
): JamStateImpl => {
  const authPool = AuthorizerPoolImpl.decode(merkleMap.get(stateKey(1))!).value;

  const authQueue = AuthorizerQueueImpl.decode(
    merkleMap.get(stateKey(2))!,
  ).value;

  const beta = BetaImpl.decode(merkleMap.get(stateKey(3))!).value;

  const safroleState = SafroleStateImpl.decode(
    merkleMap.get(stateKey(4))!,
  ).value;

  const disputes = DisputesStateImpl.decode(merkleMap.get(stateKey(5))!).value;

  const entropy = JamEntropyImpl.decode(merkleMap.get(stateKey(6))!).value;

  const iota = ValidatorsImpl.decode(merkleMap.get(stateKey(7))!).value;

  const kappa = KappaImpl.decode(merkleMap.get(stateKey(8))!).value;

  const lambda = LambdaImpl.decode(merkleMap.get(stateKey(9))!).value;

  const rho = RHOImpl.decode(merkleMap.get(stateKey(10))!).value;

  const slot = <TauImpl>SlotImpl.decode(merkleMap.get(stateKey(11))!).value;

  const privServices = PrivilegedServicesImpl.decode(
    merkleMap.get(stateKey(12))!,
  ).value;

  const statistics = JamStatisticsImpl.decode(
    merkleMap.get(stateKey(13))!,
  ).value;

  const accumulationQueue = AccumulationQueueImpl.decode(
    merkleMap.get(stateKey(14))!,
  ).value;

  const accumulationHistory = AccumulationHistoryImpl.decode(
    merkleMap.get(stateKey(15))!,
  ).value;

  const mostRecentAccumulationOutputs = LastAccOutsImpl.decode(
    merkleMap.get(stateKey(16))!,
  ).value;

  const serviceKeys = [...merkleMap.keys()].filter((k) => {
    return (
      k[0] === 255 &&
      k[2] === 0 &&
      k[4] === 0 &&
      k[6] === 0 &&
      k[8] === 0 &&
      k[9] === 0 &&
      32 + 5 * 8 + 4 * 4 + 1 === merkleMap.get(k)!.length
    );
  });

  const serviceAccounts = new DeltaImpl();
  for (const serviceDataKey of serviceKeys) {
    const serviceKey = new Uint8Array([
      serviceDataKey[1],
      serviceDataKey[3],
      serviceDataKey[5],
      serviceDataKey[7],
    ]);
    const serviceData = serviceAccountDataCodec.decode(
      merkleMap.get(serviceDataKey)!,
    ).value;

    const serviceIndex = E_sub_int<ServiceIndex>(4).decode(serviceKey).value;
    // filter out service data keys that are related to this service
    const serviceRelatedKeys = new Set(
      [...merkleMap.keys()].filter((k) => {
        return (
          k[0] === serviceKey[0] &&
          k[2] === serviceKey[1] &&
          k[4] === serviceKey[2] &&
          k[6] === serviceKey[3]
        );
      }),
    );
    const storage = new MerkleServiceAccountStorageImpl(
      serviceIndex,
      <u64>serviceData.totalOctets,
      <u32>serviceData.itemInStorage,
    );

    const serviceAccount = new ServiceAccountImpl(
      {
        codeHash: serviceData.codeHash,
        balance: serviceData.balance,
        minAccGas: serviceData.minAccGas,
        minMemoGas: serviceData.minMemoGas,
        gratis: serviceData.gratis,
        created: serviceData.created,
        lastAcc: serviceData.lastAcc,
        parent: serviceData.parent,
        preimages: new IdentityMap(),
      },
      storage,
    );

    const preimage_p_keys = [...serviceRelatedKeys.values()].filter((sk) => {
      const possiblePreimage = merkleMap.get(sk)!;
      const h = Hashing.blake2b(possiblePreimage);

      const p_p_key = stateKey(
        serviceIndex,
        new Uint8Array([...encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2)), ...h]),
      );
      return Buffer.compare(p_p_key, sk) === 0;
    });
    for (const preimagekey of preimage_p_keys) {
      const preimage = merkleMap.get(preimagekey)!;
      const h = Hashing.blake2b(preimage);
      serviceAccount.preimages.set(h, preimage);
      // we delete to not set it in storage
      serviceRelatedKeys.delete(preimagekey);
    }

    for (const storageOrRequestKey of serviceRelatedKeys) {
      storage.setStorage(
        storageOrRequestKey,
        merkleMap.get(storageOrRequestKey)!,
      );
    }

    serviceAccounts.set(serviceIndex, serviceAccount);
  }

  return new JamStateImpl({
    accumulationHistory,
    accumulationQueue,
    authPool,
    authQueue,
    beta,
    disputes,
    entropy,
    iota: toTagged(iota),
    kappa: toTagged(kappa),
    lambda: toTagged(lambda),
    mostRecentAccumulationOutputs,
    privServices,
    rho,
    safroleState,
    serviceAccounts,
    slot,
    statistics,
    headerLookupHistory: new HeaderLookupHistoryImpl(new SafeMap()),
  });
};

if (import.meta.vitest) {
  const { beforeEach, describe, it, expect } = import.meta.vitest;

  const { dummyState, randomHash } = await import("@/test/utils");
  const { merkleStateMap } = await import("./state");

  describe("reverse merkle", () => {
    let state: JamStateImpl;
    beforeEach(() => {
      state = dummyState();
    });
    it("accumulationHistory", () => {
      state.accumulationHistory.elements[0].add(randomHash());
      const newState = stateFromMerkleMap(merkleStateMap(state));
      expect(state.accumulationHistory.toJSON()).deep.eq(
        newState.accumulationHistory.toJSON(),
      );
    });
    describe("statistics", () => {
      // const { JamStatisticsImpl } = await import("@/impls/jam-statistics-impl");
      // const { ServiceStatisticsImpl } = await import(
      //   "@/impls/service-statistics-impl"
      // );
      // const { ValidatorStatisticsImpl } = await import(
      //   "@/impls/validator-statistics-impl"
      // );
      it("should decode core statistics", () => {
        state.statistics.cores.elements[1].daLoad = <u32>1;
        state.statistics.cores.elements[1].gasUsed = <Gas>2n;
        state.statistics.cores.elements[1].bundleSize = <u32>3;
        state.statistics.cores.elements[1].popularity = <u16>4;
        state.statistics.cores.elements[1].exportCount = <u16>5;
        state.statistics.cores.elements[1].importCount = <u16>6;
        state.statistics.cores.elements[1].extrinsicSize = <u32>7;
        state.statistics.cores.elements[1].extrinsicCount = <u16>8;
        const newState = stateFromMerkleMap(merkleStateMap(state));

        expect(newState.statistics.cores.toJSON()).deep.eq(
          state.statistics.cores.toJSON(),
        );
      });
      it("should decode service statistics", async () => {
        const { SingleServiceStatisticsImpl } = await import(
          "@/impls/single-service-statistics-impl"
        );
        const stat = new SingleServiceStatisticsImpl({
          providedCount: <u16>1,
          providedSize: <u32>2,
          refinementCount: <u32>3,
          refinementGasUsed: <Gas>7990n,
          importCount: <u32>5,
          extrinsicCount: <u32>6,
          extrinsicSize: <u32>7,
          exportCount: <u32>8,
          accumulateCount: <u32>9,
          accumulateGasUsed: <Gas>10n,
          // transfersCount: <u32>11,
          // transfersGasUsed: <Gas>12n,
        });
        state.statistics.services.elements.set(<ServiceIndex>0, stat);
        const newState = stateFromMerkleMap(merkleStateMap(state));
        expect(newState.statistics.services.toJSON()).deep.eq(
          state.statistics.services.toJSON(),
        );
      });
    });
  });
}
