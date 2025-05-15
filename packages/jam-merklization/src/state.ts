/**
 * Appendix D
 */
import {
  createCodec,
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  BandersnatchCodec,
  BandersnatchRingRootCodec,
  E_1,
  E_4,
  E_4_int,
  E_8,
  HashCodec,
  IdentityCodec,
  JamCodec,
  TicketIdentifierCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  bit,
  createArrayLengthDiscriminator,
  createSetCodec,
  encodeWithCodec,
  StatisticsCodec,
  WorkPackageHashCodec,
  PrivilegedServicesCodec,
  RecentHistoryCodec,
  RHOCodec,
  LengthDiscriminator,
  Ed25519PubkeyBigIntCodec,
} from "@tsjam/codec";
import {
  Hash,
  JamState,
  ServiceIndex,
  WorkPackageHash,
  WorkReport,
  SafroleState,
  ByteArrayOfLength,
  SeqOfLength,
  StateRootHash,
  u32,
} from "@tsjam/types";
import { bigintToBytes, isFallbackMode } from "@tsjam/utils";
import { createSequenceCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/serviceaccounts";

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

type StateKey = ByteArrayOfLength<31>;
/**
 * `C` in graypaper
 * $(0.6.5 - D.1)
 */
export const stateKey = (
  i: number,
  _s?: ServiceIndex | Uint8Array,
): StateKey => {
  if (_s instanceof Uint8Array) {
    const h: Uint8Array = _s;
    const s = i;
    const n = encodeWithCodec(E_4, BigInt(s));
    return new Uint8Array([
      n[0],
      h[0],
      n[1],
      h[1],
      n[2],
      h[2],
      n[3],
      h[3],
      ...h.subarray(4, 27), // ends at [26]
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
 * $(0.6.4 - D.2)
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

  // β - recentHistory
  toRet.set(
    stateKey(3),
    encodeWithCodec(RecentHistoryCodec, state.recentHistory),
  );
  // logState("recentHistory|c3", stateKey(3));

  const gamma_sCodec = createSequenceCodec<SafroleState["gamma_s"]>(
    EPOCH_LENGTH,
    state.safroleState.gamma_s[0] instanceof Uint8Array // BandersnatchKey
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (BandersnatchCodec as JamCodec<any>)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (TicketIdentifierCodec as JamCodec<any>),
  );

  toRet.set(
    stateKey(4),
    new Uint8Array([
      ...encodeWithCodec(
        createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
        state.safroleState.gamma_k,
      ),
      ...encodeWithCodec(BandersnatchRingRootCodec, state.safroleState.gamma_z),
      ...encodeWithCodec(
        E_1,
        isFallbackMode(state.safroleState.gamma_s) ? 1n : 0n,
      ),
      ...encodeWithCodec(gamma_sCodec, state.safroleState.gamma_s),
      ...encodeWithCodec(
        createArrayLengthDiscriminator(TicketIdentifierCodec),
        state.safroleState.gamma_a,
      ),
    ]),
  );

  // 5
  toRet.set(
    stateKey(5),
    new Uint8Array([
      ...encodeWithCodec(
        createArrayLengthDiscriminator(HashCodec),
        [...state.disputes.psi_g.values()].sort((a, b) => (a - b < 0 ? -1 : 1)),
      ),
      ...encodeWithCodec(
        createArrayLengthDiscriminator(HashCodec),
        [...state.disputes.psi_b.values()].sort((a, b) => (a - b < 0 ? -1 : 1)),
      ),
      ...encodeWithCodec(
        createArrayLengthDiscriminator(HashCodec),
        [...state.disputes.psi_w.values()].sort((a, b) => (a - b < 0 ? -1 : 1)),
      ),
      ...encodeWithCodec(
        createArrayLengthDiscriminator(Ed25519PubkeyBigIntCodec),
        [...state.disputes.psi_o.values()].sort((a, b) => Number(a - b)),
      ),
    ]),
  );
  // logState("5|c5", stateKey(5));

  // 6
  toRet.set(
    stateKey(6),
    new Uint8Array([
      ...encodeWithCodec(HashCodec, state.entropy[0]),
      ...encodeWithCodec(HashCodec, state.entropy[1]),
      ...encodeWithCodec(HashCodec, state.entropy[2]),
      ...encodeWithCodec(HashCodec, state.entropy[3]),
    ]),
  );
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
    encodeWithCodec(PrivilegedServicesCodec, state.privServices),
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
      new Uint8Array([
        ...encodeWithCodec(HashCodec, serviceAccount.codeHash),
        ...encodeWithCodec(E_8, serviceAccount.balance),
        ...encodeWithCodec(E_8, serviceAccount.minGasAccumulate),
        ...encodeWithCodec(E_8, serviceAccount.minGasOnTransfer),
        ...encodeWithCodec(E_8, serviceAccountTotalOctets(serviceAccount)),
        ...encodeWithCodec(
          E_4_int,
          serviceAccountItemInStorage(serviceAccount),
        ),
      ]),
    );

    for (const [_k, v] of serviceAccount.storage) {
      const k = encodeWithCodec(HashCodec, _k);
      const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 1));

      toRet.set(
        stateKey(serviceIndex, new Uint8Array([...pref, ...k.subarray(0, 28)])),
        encodeWithCodec(IdentityCodec, v),
      );
    }

    for (const [_h, p] of serviceAccount.preimage_p) {
      const h = encodeWithCodec(HashCodec, _h);
      const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
      toRet.set(
        stateKey(serviceIndex, new Uint8Array([...pref, ...h.subarray(1, 29)])),
        encodeWithCodec(IdentityCodec, p),
      );
    }

    for (const [h, lm] of serviceAccount.preimage_l) {
      for (const [l, t] of lm) {
        const e_l = encodeWithCodec(E_4_int, l);
        const h_h = Hashing.blake2bBuf(encodeWithCodec(HashCodec, h));

        toRet.set(
          stateKey(
            serviceIndex,
            new Uint8Array([...e_l, ...h_h.subarray(2, 30)]),
          ),
          encodeWithCodec(createArrayLengthDiscriminator(E_4_int), t),
        );
      }
    }
  }

  return toRet;
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
