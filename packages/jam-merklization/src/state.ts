/*
 * Appendix D
 */
import {
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  E_4,
  E_4_int,
  E_sub_int,
  HashCodec,
  PrivilegedServicesCodec,
  RHOCodec,
  StatisticsCodec,
  ValidatorDataCodec,
  WorkPackageHashCodec,
  WorkReportCodec,
  bit,
  createArrayLengthDiscriminator,
  createCodec,
  createLengthDiscrimantedSetCodec,
  createSequenceCodec,
  encodeWithCodec,
  mapCodec,
} from "@tsjam/codec";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";
import {
  ByteArrayOfLength,
  Hash,
  JamState,
  SeqOfLength,
  ServiceAccount,
  ServiceIndex,
  StateKey,
  StateRootHash,
  Tau,
  UpToSeq,
  WorkPackageHash,
  WorkReport,
  u32,
  u64,
} from "@tsjam/types";
import { bigintToBytes, toTagged } from "@tsjam/utils";
import assert from "assert";
import { MerkleMap } from "./merkleMap";
import { MerkleServiceAccountStorageImpl } from "./merkleServiceAccountStorage";
import {
  betaCodec,
  disputesCodec,
  entropyCodec,
  safroleCodec,
  serviceAccountDataCodec,
  thetaCodec,
} from "./stateCodecs";
import { stateKey } from "./utils";

/**
 * Merkelize state
 * `Mσ`
 * $(0.6.4 - D.5)
 */
export const merkelizeState = (state: JamState): StateRootHash => {
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
  const lb = encodeWithCodec(HashCodec, l);
  const rb = encodeWithCodec(HashCodec, r);
  return new Uint8Array([
    lb[0] & 0b01111111,
    ...lb.subarray(1),
    ...rb,
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
      ...Hashing.blake2bBuf(v),
    ]) as ByteArrayOfLength<64>;
  }
};

// $(0.6.4 - D.6)
export const M_fn = (d: Map<bit[], [StateKey, Uint8Array]>): Hash => {
  if (d.size === 0) {
    return 0n as Hash;
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
export const merkleStateMap = (state: JamState): MerkleMap => {
  const toRet = new MerkleMap();

  toRet.set(
    stateKey(1),
    encodeWithCodec(AuthorizerPoolCodec(), state.authPool),
  );
  // logState("authPool|c1", stateKey(1));

  toRet.set(
    stateKey(2),
    encodeWithCodec(AuthorizerQueueCodec(), state.authQueue),
  );
  // logState("authQueue|c2", stateKey(2));

  // β
  toRet.set(stateKey(3), encodeWithCodec(betaCodec, state.beta));
  // logState("recentHistory|c3", stateKey(3));

  toRet.set(stateKey(4), encodeWithCodec(safroleCodec, state.safroleState));

  // 5
  toRet.set(stateKey(5), encodeWithCodec(disputesCodec, state.disputes));
  // logState("5|c5", stateKey(5));

  // 6
  toRet.set(stateKey(6), encodeWithCodec(entropyCodec, state.entropy));
  // logState("c6", stateKey(6));

  // 7
  toRet.set(
    stateKey(7),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.iota,
    ),
  );
  // logState("c7", stateKey(7));

  // 8
  toRet.set(
    stateKey(8),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.kappa,
    ),
  );

  // 9
  toRet.set(
    stateKey(9),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.lambda,
    ),
  );

  // 10
  toRet.set(stateKey(10), encodeWithCodec(RHOCodec(), state.rho));

  // 11
  toRet.set(stateKey(11), encodeWithCodec(E_4, BigInt(state.tau)));

  // 12
  toRet.set(
    stateKey(12),
    encodeWithCodec(PrivilegedServicesCodec(CORES), state.privServices),
  );

  // 13
  toRet.set(
    stateKey(13),
    encodeWithCodec(
      StatisticsCodec(NUMBER_OF_VALIDATORS, CORES),
      state.statistics,
    ),
  );

  // 14
  const sortedDepsQueue = state.accumulationQueue.map((a) =>
    a.map((b) => ({
      workReport: b.workReport,
      dependencies: [...b.dependencies.values()].sort((a, b) =>
        a - b < 0 ? -1 : 1,
      ),
    })),
  );

  // c
  toRet.set(
    stateKey(14),
    encodeWithCodec(
      createSequenceCodec(
        EPOCH_LENGTH,
        createArrayLengthDiscriminator(
          createCodec<{
            workReport: WorkReport;
            dependencies: WorkPackageHash[];
          }>([
            ["workReport", WorkReportCodec],
            [
              "dependencies",
              createArrayLengthDiscriminator<WorkPackageHash[]>(
                WorkPackageHashCodec,
              ),
            ],
          ]),
        ),
      ),
      sortedDepsQueue as SeqOfLength<
        { workReport: WorkReport; dependencies: WorkPackageHash[] }[],
        typeof EPOCH_LENGTH
      >,
    ),
  );

  // 15 - accumulationHistory
  toRet.set(
    stateKey(15),
    encodeWithCodec(
      createSequenceCodec(
        EPOCH_LENGTH,
        createLengthDiscrimantedSetCodec(WorkPackageHashCodec, (a, b) =>
          a < b ? -1 : 1,
        ),
      ),
      state.accumulationHistory,
    ),
  );

  // 16 thetha
  toRet.set(
    stateKey(16),
    encodeWithCodec(thetaCodec, state.mostRecentAccumulationOutputs),
  );

  for (const [serviceIndex, serviceAccount] of state.serviceAccounts) {
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

    for (const [_h, p] of serviceAccount.preimage_p) {
      const h = encodeWithCodec(HashCodec, _h);
      const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
      toRet.set(stateKey(serviceIndex, new Uint8Array([...pref, ...h])), p);
    }

    for (const [h, lm] of serviceAccount.preimage_l) {
      for (const [l, t] of lm) {
        const e_l = encodeWithCodec(E_4_int, l);
        const h_h = encodeWithCodec(HashCodec, h);
        toRet.set(
          stateKey(serviceIndex, new Uint8Array([...e_l, ...h_h])),
          encodeWithCodec(createArrayLengthDiscriminator(E_4_int), t),
        );
      }
    }
  }

  return toRet;
};

export const stateFromMerkleMap = (merkleMap: MerkleMap): JamState => {
  const authPool = AuthorizerPoolCodec().decode(
    merkleMap.get(stateKey(1))!,
  ).value;

  const authQueue = AuthorizerQueueCodec().decode(
    merkleMap.get(stateKey(2))!,
  ).value;

  const beta = betaCodec.decode(merkleMap.get(stateKey(3))!).value;

  const safroleState = safroleCodec.decode(merkleMap.get(stateKey(4))!).value;

  const disputes = disputesCodec.decode(merkleMap.get(stateKey(5))!).value;

  const entropy = entropyCodec.decode(merkleMap.get(stateKey(6))!).value;

  const iota = createSequenceCodec<JamState["iota"]>(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(7))!).value;

  const kappa = createSequenceCodec<JamState["kappa"]>(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(8))!).value;

  const lambda = createSequenceCodec<JamState["lambda"]>(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(9))!).value;

  const rho = RHOCodec().decode(merkleMap.get(stateKey(10))!).value;

  const tau = E_sub_int<Tau>(4).decode(merkleMap.get(stateKey(11))!).value;

  const privServices = PrivilegedServicesCodec(CORES).decode(
    merkleMap.get(stateKey(12))!,
  ).value;

  const statistics = StatisticsCodec(NUMBER_OF_VALIDATORS, CORES).decode(
    merkleMap.get(stateKey(13))!,
  ).value;

  const accumulationQueue = createSequenceCodec(
    EPOCH_LENGTH,
    createArrayLengthDiscriminator(
      mapCodec(
        createCodec<{
          workReport: WorkReport;
          dependencies: WorkPackageHash[];
        }>([
          ["workReport", WorkReportCodec],
          [
            "dependencies",
            createArrayLengthDiscriminator<WorkPackageHash[]>(
              WorkPackageHashCodec,
            ),
          ],
        ]),
        (x) => ({
          workReport: x.workReport,
          dependencies: new Set(x.dependencies),
        }),
        (x) => ({
          workReport: x.workReport,
          dependencies: [...x.dependencies.values()],
        }),
      ),
    ),
  ).decode(merkleMap.get(stateKey(14))!).value;

  const accumulationHistory = createSequenceCodec(
    EPOCH_LENGTH,
    createLengthDiscrimantedSetCodec(WorkPackageHashCodec, (a, b) =>
      a - b < 0 ? -1 : 1,
    ),
  ).decode(merkleMap.get(stateKey(15))!).value;

  const mostRecentAccumulationOutputs = thetaCodec.decode(
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

  const serviceAccounts: Map<ServiceIndex, ServiceAccount> = new Map();
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

    const serviceAccount: ServiceAccount = new ServiceAccountImpl({
      codeHash: serviceData.codeHash,
      balance: serviceData.balance,
      minGasAccumulate: serviceData.minGasAccumulate,
      minGasOnTransfer: serviceData.minGasOnTransfer,
      gratisStorageOffset: serviceData.gratisStorageOffset,
      creationTimeSlot: serviceData.creationTimeSlot,
      lastAccumulationTimeSlot: serviceData.lastAccumulationTimeSlot,
      parentService: serviceData.parentService,
      storage,
      preimage_l: new Map(),
      preimage_p: new Map(),
    });

    const preimage_p_keys = [...serviceRelatedKeys.values()].filter((sk) => {
      const possiblePreimage = merkleMap.get(sk)!;
      const h = Hashing.blake2bBuf(possiblePreimage);

      const p_p_key = stateKey(
        serviceIndex,
        new Uint8Array([...encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2)), ...h]),
      );
      return Buffer.compare(p_p_key, sk) === 0;
    });
    for (const preimagekey of preimage_p_keys) {
      const preimage = merkleMap.get(preimagekey)!;
      const h = Hashing.blake2b(preimage);
      const hb = Hashing.blake2bBuf(preimage);
      serviceAccount.preimage_p.set(h, preimage);

      // get preimage l
      //
      const length = preimage.length;

      const e_l = encodeWithCodec(E_sub_int(4), length);
      const p_l_key = stateKey(serviceIndex, new Uint8Array([...e_l, ...hb]));
      const pl = merkleMap.get(p_l_key);
      assert(typeof pl !== "undefined", "Preimage l not found");
      const pl_decoded = createArrayLengthDiscriminator<UpToSeq<Tau, 3>>(
        E_sub_int<Tau>(4),
      ).decode(pl).value;
      serviceAccount.preimage_l.set(
        h,
        serviceAccount.preimage_l.get(h) ?? new Map(),
      );
      serviceAccount.preimage_l.get(h)!.set(toTagged(<u32>length), pl_decoded);
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

  return <JamState>{
    accumulationHistory,
    accumulationQueue,
    authPool,
    authQueue,
    beta,
    disputes,
    entropy,
    iota,
    kappa,
    lambda,
    mostRecentAccumulationOutputs,
    privServices,
    rho,
    safroleState,
    serviceAccounts,
    tau,
    statistics,
    headerLookupHistory: new Map(),
  };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const fs = await import("fs");
  describe("merkle", () => {
    it("test from vectors", () => {
      const r: Array<{ input: Record<string, string>; output: string }> =
        JSON.parse(
          fs.readFileSync(
            new URL(`../test/fixtures/trie.json`, import.meta.url).pathname,
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
        expect(Buffer.from(bigintToBytes(res, 32)).toString("hex")).eq(
          t.output,
        );
      }
    });
  });
}
