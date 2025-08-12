import {
  E_4_int,
  E_sub_int,
  JamCodec,
  bit,
  createArrayLengthDiscriminator,
  encodeWithCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { AccumulationHistoryImpl, AccumulationQueueImpl, AuthorizerPoolImpl, AuthorizerQueueImpl, BetaImpl, DeltaImpl, DisputesStateImpl, HeaderLookupHistoryImpl, JamEntropyImpl, JamStateImpl, JamStatisticsImpl, KappaImpl, LambdaImpl, LastAccOutsImpl, MerkleServiceAccountStorageImpl, PrivilegedServicesImpl, RHOImpl, SafroleStateImpl, ServiceAccountImpl, SlotImpl, ValidatorsImpl } from "@/impls";
import type { TauImpl } from "@/impls";
import {
  ByteArrayOfLength,
  Hash,
  JamState,
  ServiceIndex,
  StateKey,
  StateRootHash,
  UpToSeq,
  u32,
  u64,
} from "@tsjam/types";
import assert from "assert";

import { serviceAccountDataCodec } from "./state-codecs";
import { stateKey } from "./utils";

import { toTagged } from "@tsjam/utils";
import { IdentityMap } from "@/data-structures/identity-map";
import { SafeMap } from "@/data-structures/safe-map";

/**
 * Merkelize state
 * `Mσ`
 * $(0.6.4 - D.5)
 */
export const merkelizeState = (state: JamStateImpl): StateRootHash => {
  const stateMap = merkleStateMap(state);
  return M_fn(
    new Map(
      [...stateMap.entries()].map(([k, v]) => {
        return [bits(k), [k, v]];
      }),
    ),
  ) as StateRootHash;
};

export const bits = (ar: Uint8Array): bit[] => {
  const a = [...ar]
    .map((a) =>
      a
        .toString(2)
        .padStart(8, "0")
        .split("")
        .map((a) => parseInt(a)),
    )
    .flat();
  return a as bit[];
};

// $(0.6.5 - D.3)
const B_fn = (l: Hash, r: Hash): ByteArrayOfLength<64> => {
  return new Uint8Array([
    l[0] & 0b01111111,
    ...l.subarray(1),
    ...r,
  ]) as ByteArrayOfLength<64>;
};

// $(0.6.4 - D.4) | implementation avoids using bits()
const L_fn = (
  k: ByteArrayOfLength<31>,
  v: Uint8Array,
): ByteArrayOfLength<64> => {
  if (v.length <= 32) {
    return new Uint8Array([
      0b10000000 + v.length,
      ...k,
      ...v,
      ...new Array(32 - v.length).fill(0),
    ]) as ByteArrayOfLength<64>;
  } else {
    return new Uint8Array([
      0b11000000,
      ...k,
      ...Hashing.blake2b(v),
    ]) as ByteArrayOfLength<64>;
  }
};

// $(0.6.4 - D.6)
export const M_fn = (d: Map<bit[], [StateKey, Uint8Array]>): Hash => {
  if (d.size === 0) {
    return <Hash>new Uint8Array(32).fill(0);
  } else if (d.size === 1) {
    const [[k, v]] = d.values();
    return Hashing.blake2b(L_fn(k, v));
  } else {
    const l = new Map(
      [...d.entries()]
        .filter(([k]) => k[0] === 0)
        .map(([k, v]) => [k.slice(1), v]),
    );
    const r = new Map(
      [...d.entries()]
        .filter(([k]) => k[0] === 1)
        .map(([k, v]) => [k.slice(1), v]),
    );
    return Hashing.blake2b(B_fn(M_fn(l), M_fn(r)));
  }
};

/*
 * `T(σ)`
 * $(0.6.7 - D.2)
 */
export const merkleStateMap = (state: JamStateImpl) => {
  const toRet: IdentityMap<StateKey, 31, Uint8Array> = new IdentityMap();

  toRet.set(stateKey(1), state.authPool.toBinary());

  toRet.set(stateKey(2), state.authQueue.toBinary());

  // β
  toRet.set(stateKey(3), state.beta.toBinary());

  toRet.set(stateKey(4), state.safroleState.toBinary());

  // 5
  toRet.set(stateKey(5), state.disputes.toBinary());

  // 6
  toRet.set(stateKey(6), state.entropy.toBinary());

  // 7
  toRet.set(stateKey(7), state.iota.toBinary());

  // 8
  toRet.set(stateKey(8), state.kappa.toBinary());

  // 9
  toRet.set(stateKey(9), state.lambda.toBinary());

  // 10
  toRet.set(stateKey(10), state.rho.toBinary());

  // 11
  toRet.set(stateKey(11), state.slot.toBinary());

  // 12
  toRet.set(stateKey(12), state.privServices.toBinary());

  // 13
  toRet.set(stateKey(13), state.statistics.toBinary());

  // 14
  toRet.set(stateKey(14), state.accumulationQueue.toBinary());

  // 15 - accumulationHistory
  toRet.set(stateKey(15), state.accumulationHistory.toBinary());

  // 16 thetha
  toRet.set(stateKey(16), state.mostRecentAccumulationOutputs.toBinary());

  for (const [serviceIndex, serviceAccount] of state.serviceAccounts.elements) {
    toRet.set(
      stateKey(255, serviceIndex),
      encodeWithCodec(serviceAccountDataCodec, {
        ...serviceAccount,
        itemInStorage: serviceAccount.itemInStorage(),
        totalOctets: serviceAccount.totalOctets(),
      }),
    );

    for (const [stateKey, v] of serviceAccount.storage.entries()) {
      toRet.set(stateKey, v);
    }

    for (const [h, p] of serviceAccount.preimages) {
      const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
      toRet.set(stateKey(serviceIndex, new Uint8Array([...pref, ...h])), p);
    }

    for (const [h, lm] of serviceAccount.requests) {
      for (const [l, t] of lm) {
        const e_l = encodeWithCodec(E_4_int, l);
        toRet.set(
          stateKey(serviceIndex, new Uint8Array([...e_l, ...h])),
          encodeWithCodec(createArrayLengthDiscriminator(SlotImpl), t),
        );
      }
    }
  }

  return toRet;
};

export const stateFromMerkleMap = (
  merkleMap: IdentityMap<StateKey, 31, Uint8Array>,
): JamState => {
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
      32 + 5 * 8 + 4 * 4 === merkleMap.get(k)!.length
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
      <u64>0n, // we fix octets later
    );

    const serviceAccount = new ServiceAccountImpl({
      codeHash: serviceData.codeHash,
      balance: serviceData.balance,
      minAccGas: serviceData.minAccGas,
      minMemoGas: serviceData.minMemoGas,
      gratis: serviceData.gratis,
      created: serviceData.created,
      lastAcc: serviceData.lastAcc,
      parent: serviceData.parent,
      storage,
      requests: new IdentityMap(),
      preimages: new IdentityMap(),
    });

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

      // get preimage l
      //
      const length = preimage.length;

      const e_l = encodeWithCodec(E_sub_int(4), length);
      const p_l_key = stateKey(serviceIndex, new Uint8Array([...e_l, ...h]));
      const pl = merkleMap.get(p_l_key);
      assert(typeof pl !== "undefined", "Preimage l not found");
      const pl_decoded = createArrayLengthDiscriminator<UpToSeq<SlotImpl, 3>>(
        <JamCodec<SlotImpl>>SlotImpl,
      ).decode(pl).value;
      serviceAccount.requests.set(
        h,
        serviceAccount.requests.get(h) ?? new Map(),
      );
      serviceAccount.requests.get(h)!.set(toTagged(<u32>length), pl_decoded);
      serviceRelatedKeys.delete(preimagekey);
      serviceRelatedKeys.delete(
        [...serviceRelatedKeys.keys()].find(
          (a) => Buffer.compare(a, p_l_key) === 0,
        )!,
      );
    }

    // we now miss storage stuff
    //
    for (const storageStateKey of serviceRelatedKeys) {
      const storageValue = merkleMap.get(storageStateKey)!;
      storage.setFromStateKey(storageStateKey, storageValue);
      serviceRelatedKeys.delete(storageStateKey);
    }
    // we fix the octets
    storage.octets = <u64>(
      (serviceData.totalOctets - serviceAccount.totalOctets())
    );

    assert(
      serviceRelatedKeys.size === 0,
      "Not all service keys were processed",
    );
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
  const { describe, it, expect } = import.meta.vitest;
  const fs = await import("fs");
  describe("merkle", () => {
    it("test from vectors", () => {
      const r: Array<{ input: Record<string, string>; output: string }> =
        JSON.parse(
          fs.readFileSync(
            new URL(`../../test/fixtures/trie.json`, import.meta.url).pathname,
            "utf8",
          ),
        );
      for (const t of r) {
        const m = new Map<bit[], [StateKey, Uint8Array]>();
        for (const key in t.input) {
          const keyBuf = Buffer.from(`${key}`, "hex").subarray(
            0,
            31,
          ) as Uint8Array as StateKey;
          const keyBits = bits(keyBuf);
          //const keyHash: Hash = bytesToBigInt(keyBuf);
          const value = Buffer.from(t.input[key], "hex");
          m.set(keyBits, [keyBuf, value]);
        }
        const res = M_fn(m);
        expect(Buffer.from(res).toString("hex")).eq(t.output);
      }
    });
  });
}
