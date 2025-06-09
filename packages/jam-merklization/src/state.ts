/**
 * Appendix D
 */
import {
  createCodec,
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  E_4,
  E_4_int,
  E_8,
  HashCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  bit,
  createArrayLengthDiscriminator,
  createSetCodec,
  encodeWithCodec,
  StatisticsCodec,
  WorkPackageHashCodec,
  PrivilegedServicesCodec,
  RHOCodec,
  LengthDiscriminator,
  E_sub_int,
} from "@tsjam/codec";
import {
  Hash,
  JamState,
  ServiceIndex,
  WorkPackageHash,
  WorkReport,
  ByteArrayOfLength,
  SeqOfLength,
  StateRootHash,
  u32,
  StateKey,
  ServiceAccount,
  Tau,
  UpToSeq,
} from "@tsjam/types";
import { bigintToBytes, toTagged } from "@tsjam/utils";
import { createSequenceCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  betaCodec,
  disputesCodec,
  entropyCodec,
  safroleCodec,
  serviceAccountDataCodec,
} from "./stateCodecs";
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";
import assert from "assert";

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

const bits = (ar: Uint8Array): bit[] => {
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
const M_fn = (d: Map<bit[], [StateKey, Uint8Array]>): Hash => {
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

/**
 * `C` in graypaper
 * $(0.6.7 - D.1)
 */
export const stateKey = (
  i: number,
  _s?: ServiceIndex | Uint8Array,
): StateKey => {
  if (_s instanceof Uint8Array) {
    const h: Uint8Array = _s;
    const a = Hashing.blake2bBuf(h);
    const s = i;
    const n = encodeWithCodec(E_4, BigInt(s));
    return new Uint8Array([
      n[0],
      a[0],
      n[1],
      a[1],
      n[2],
      a[2],
      n[3],
      a[3],
      ...a.subarray(4, 27), // ends at [26]
    ]) as StateKey;
  }
  if (typeof _s === "number") {
    // its ServiceIndex
    const n = encodeWithCodec(E_4, BigInt(_s));
    return new Uint8Array([
      i,
      n[0],
      0,
      n[1],
      0,
      n[2],
      0,
      n[3],
      ...new Array(31 - 4 - 4).fill(0),
    ]) as StateKey;
  }
  return new Uint8Array([i, ...new Array(30).fill(0)]) as StateKey;
};

/*
 * `T(σ)`
 * $(0.6.7 - D.2)
 */
export const merkleStateMap = (state: JamState): Map<StateKey, Uint8Array> => {
  const toRet = new Map<StateKey, Uint8Array>();

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
              createArrayLengthDiscriminator(WorkPackageHashCodec),
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
        new LengthDiscriminator<Set<WorkPackageHash>>({
          ...createSetCodec(WorkPackageHashCodec, (a, b) =>
            a - b < 0 ? -1 : 1,
          ),
          length(v) {
            return v.size;
          },
        }),
      ),
      state.accumulationHistory,
    ),
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
        const h_h = Hashing.blake2bBuf(encodeWithCodec(HashCodec, h));

        toRet.set(
          stateKey(serviceIndex, new Uint8Array([...e_l, ...h_h])),
          encodeWithCodec(createArrayLengthDiscriminator(E_4_int), t),
        );
      }
    }
  }

  return toRet;
};

const stateFromMerkleMap = (merkleMap: Map<StateKey, Uint8Array>): JamState => {
  const authPool = AuthorizerPoolCodec().decode(
    merkleMap.get(stateKey(1))!,
  ).value;

  const authQueue = AuthorizerQueueCodec().decode(
    merkleMap.get(stateKey(2))!,
  ).value;

  const beta = betaCodec.decode(merkleMap.get(stateKey(3))!).value;

  const safrole = safroleCodec.decode(merkleMap.get(stateKey(4))!).value;

  const disputes = disputesCodec.decode(merkleMap.get(stateKey(5))!).value;

  const entropy = entropyCodec.decode(merkleMap.get(stateKey(6))!).value;

  const iota = createSequenceCodec(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(7))!).value;

  const kappa = createSequenceCodec(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(8))!).value;

  const lambda = createSequenceCodec(
    NUMBER_OF_VALIDATORS,
    ValidatorDataCodec,
  ).decode(merkleMap.get(stateKey(9))!).value;

  const rho = RHOCodec().decode(merkleMap.get(stateKey(10))!).value;

  const tau = E_4.decode(merkleMap.get(stateKey(11))!).value;

  const privServices = PrivilegedServicesCodec(CORES).decode(
    merkleMap.get(stateKey(12))!,
  ).value;

  const statistics = StatisticsCodec(NUMBER_OF_VALIDATORS, CORES).decode(
    merkleMap.get(stateKey(13))!,
  ).value;

  const accumulationQueue = createSequenceCodec(
    EPOCH_LENGTH,
    createArrayLengthDiscriminator(
      createCodec<{
        workReport: WorkReport;
        dependencies: WorkPackageHash[];
      }>([
        ["workReport", WorkReportCodec],
        ["dependencies", createArrayLengthDiscriminator(WorkPackageHashCodec)],
      ]),
    ),
  ).decode(merkleMap.get(stateKey(14))!).value;

  const accumulationHistory = createSequenceCodec(
    EPOCH_LENGTH,
    new LengthDiscriminator<Set<WorkPackageHash>>({
      ...createSetCodec(WorkPackageHashCodec, (a, b) => (a - b < 0 ? -1 : 1)),
      length(v) {
        return v.size;
      },
    }),
  ).decode(merkleMap.get(stateKey(15))!).value;

  const serviceKeys = [...merkleMap.keys()].filter((k) => {
    return (
      k[0] === 255 &&
      k[2] === 0 &&
      k[4] === 0 &&
      k[6] === 0 &&
      k[8] === 0 &&
      k[9] === 0 &&
      32 + 8 * 4 + 4 === merkleMap.get(k)!.length
    );
  });
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
          k[4] === serviceKey[3] &&
          k[6] === serviceKey[4]
        );
      }),
    );

    const serviceAccount: ServiceAccount = new ServiceAccountImpl(serviceIndex);
    serviceAccount.codeHash = serviceData.codeHash;
    serviceAccount.balance = serviceData.balance;
    serviceAccount.minGasAccumulate = serviceData.minGasAccumulate;
    serviceAccount.minGasOnTransfer = serviceData.minGasOnTransfer;
    serviceAccount.gratisStorageOffset = serviceData.gratisStorageOffset;
    serviceAccount.creationTimeSlot = serviceData.creationTimeSlot;
    serviceAccount.lastAccumulationTimeSlot =
      serviceData.lastAccumulationTimeSlot;
    serviceAccount.parentService = serviceData.parentService;

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
      serviceRelatedKeys.delete(p_l_key);
    }
  }

  throw new Error();
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
