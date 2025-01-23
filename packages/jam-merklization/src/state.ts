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
  E_M,
  E_sub_int,
  Ed25519PubkeyCodec,
  HashCodec,
  IdentityCodec,
  JamCodec,
  Optional,
  TicketIdentifierCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  bit,
  buildGenericKeyValueCodec,
  buildKeyValueCodec,
  createArrayLengthDiscriminator,
  createSetCodec,
  encodeWithCodec,
  ValidatorStatisticsCodec,
} from "@tsjam/codec";
import {
  RHO,
  Hash,
  JamState,
  MerkeTreeRoot,
  RecentHistoryItem,
  ServiceIndex,
  Tau,
  WorkPackageHash,
  WorkReport,
  SafroleState,
  ByteArrayOfLength,
} from "@tsjam/types";
import {
  bigintToBytes,
  bytesToBigInt,
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/utils";
import { createSequenceCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * Merkelize state
 * `Mσ`
 * $(0.5.4 - D.5)
 */
export const merkelizeState = (state: JamState): Hash => {
  const stateMap = transformState(state);
  return M_fn(
    new Map(
      [...stateMap.entries()].map(([k, v]) => {
        return [bits(bigintToBytes(k, 32)), [k, v]];
      }),
    ),
  );
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

/*
  this is deprecated now for a more performant version with bytes and bitwise
const bits_inv = (bits: bit[]): Uint8Array => {
  assert(bits.length % 8 === 0);
  const bytes = [];
  for (let i = 0; i < bits.length / 8; i++) {
    const curBits = bits.slice(i * 8, i * 8 + 8).join("");
    bytes[i] = parseInt(curBits, 2);
  }
  return new Uint8Array(bytes);
};
*/

// $(0.5.4 - D.3)
const B_fn = (l: Hash, r: Hash): ByteArrayOfLength<64> => {
  const lb = bigintToBytes(l, 32);
  const rb = bigintToBytes(r, 32);
  return new Uint8Array([
    lb[0] & 0b01111111,
    ...lb.subarray(1),
    ...rb,
  ]) as ByteArrayOfLength<64>;
};

// $(0.5.4 - D.4) | implementation avoids using bits()
// following my
const L_fn = (k: Hash, v: Uint8Array): ByteArrayOfLength<64> => {
  if (v.length <= 32) {
    return new Uint8Array([
      // NOTE: the following line is out of spec as stated in my comment
      // https://github.com/w3f/jamtestvectors/pull/14#issuecomment-2549423040
      // it should be 0b10000000 + (v.length >> 2)
      0b10000000 + v.length,
      ...bigintToBytes(k, 32).subarray(0, 31),
      ...v,
      ...new Array(32 - v.length).fill(0),
    ]) as ByteArrayOfLength<64>;
  } else {
    return new Uint8Array([
      0b11000000,
      ...bigintToBytes(k, 32).subarray(0, 31),
      ...Hashing.blake2bBuf(v),
    ]) as ByteArrayOfLength<64>;
  }
};

// $(0.5.4 - D.6)
const M_fn = (d: Map<bit[], [Hash, Uint8Array]>): Hash => {
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
 * $(0.5.4 - D.1)
 */
const C_fn = (i: number, _s?: ServiceIndex | Uint8Array): Hash => {
  if (_s instanceof Uint8Array) {
    const h: Uint8Array = _s;
    const s = i;
    const n = encodeWithCodec(E_4, BigInt(s));
    return bytesToBigInt(
      new Uint8Array([
        n[0],
        h[0],
        n[1],
        h[1],
        n[2],
        h[2],
        n[3],
        h[3],
        ...h.subarray(4),
      ]) as unknown as ByteArrayOfLength<32>,
    );
  }
  if (typeof _s === "number") {
    // its ServiceIndex
    const n = encodeWithCodec(E_4, BigInt(_s));
    return bytesToBigInt(
      new Uint8Array([i, ...n, ...new Array(32 - 4 - 1).fill(0)]),
    );
  }
  return bytesToBigInt(new Uint8Array([1, ...new Array(31).fill(0), i]));
};

const singleHistoryItemCodec: JamCodec<RecentHistoryItem> & {
  wpCodec: JamCodec<Map<WorkPackageHash, Hash>>;
} = {
  wpCodec: buildKeyValueCodec(HashCodec),

  encode(value, bytes) {
    let offset = 0;
    offset += HashCodec.encode(value.headerHash, bytes);
    offset += E_M.encode(value.accumulationResultMMR, bytes.subarray(offset));
    offset += HashCodec.encode(value.stateRoot, bytes.subarray(offset));
    offset += this.wpCodec.encode(
      value.reportedPackages,
      bytes.subarray(offset),
    );
    return offset;
  },
  decode(bytes) {
    const headerHash = HashCodec.decode(bytes);
    const accumulationResultMMR = E_M.decode(
      bytes.subarray(headerHash.readBytes),
    );
    const stateRoot = HashCodec.decode(
      bytes.subarray(headerHash.readBytes + accumulationResultMMR.readBytes),
    );
    const reportedPackages = this.wpCodec.decode(
      bytes.subarray(
        headerHash.readBytes +
          accumulationResultMMR.readBytes +
          stateRoot.readBytes,
      ),
    );
    return {
      value: {
        headerHash: headerHash.value,
        accumulationResultMMR: accumulationResultMMR.value,
        stateRoot: stateRoot.value as MerkeTreeRoot,
        reportedPackages:
          reportedPackages.value as unknown as RecentHistoryItem["reportedPackages"],
      },
      readBytes:
        headerHash.readBytes +
        accumulationResultMMR.readBytes +
        stateRoot.readBytes +
        reportedPackages.readBytes,
    };
  },
  encodedSize(value) {
    return (
      HashCodec.encodedSize(value.headerHash) +
      E_M.encodedSize(value.accumulationResultMMR) +
      HashCodec.encodedSize(value.stateRoot) +
      this.wpCodec.encodedSize(value.reportedPackages)
    );
  },
};

/*
 * `T(σ)`
 * $(0.5.4 - D.2)
 */
const transformState = (state: JamState): Map<Hash, Uint8Array> => {
  const toRet = new Map<Hash, Uint8Array>();

  toRet.set(C_fn(1), encodeWithCodec(AuthorizerPoolCodec(), state.authPool));
  toRet.set(C_fn(2), encodeWithCodec(AuthorizerQueueCodec(), state.authQueue));
  // β - recentHistory
  toRet.set(
    C_fn(3),
    encodeWithCodec(
      createArrayLengthDiscriminator(singleHistoryItemCodec),
      state.recentHistory,
    ),
  );

  const gamma_sCodec = createSequenceCodec<SafroleState["gamma_s"]>(
    EPOCH_LENGTH,
    state.safroleState.gamma_s[0] instanceof Uint8Array // BandersnatchKey
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (BandersnatchCodec as JamCodec<any>)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (TicketIdentifierCodec as JamCodec<any>),
  );

  toRet.set(
    C_fn(4),
    new Uint8Array([
      ...encodeWithCodec(
        createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
        state.safroleState.gamma_k,
      ),
      ...encodeWithCodec(BandersnatchRingRootCodec, state.safroleState.gamma_z),
      ...encodeWithCodec(
        E_1,
        typeof state.safroleState.gamma_s[0] === "bigint" ? 1n : 0n,
      ),
      ...encodeWithCodec(gamma_sCodec, state.safroleState.gamma_s),
      ...encodeWithCodec(
        createArrayLengthDiscriminator(TicketIdentifierCodec),
        state.safroleState.gamma_a,
      ),
    ]),
  );

  // 5
  // TODO: sorting of verticts
  toRet.set(
    C_fn(5),
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
        createArrayLengthDiscriminator(Ed25519PubkeyCodec),
        [...state.disputes.psi_o.values()].sort((a, b) => (a - b < 0 ? -1 : 1)),
      ),
    ]),
  );

  // 6
  toRet.set(
    C_fn(6),
    new Uint8Array([
      ...encodeWithCodec(HashCodec, state.entropy[0]),
      ...encodeWithCodec(HashCodec, state.entropy[1]),
      ...encodeWithCodec(HashCodec, state.entropy[2]),
      ...encodeWithCodec(HashCodec, state.entropy[3]),
    ]),
  );

  // 7
  toRet.set(
    C_fn(7),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.iota,
    ),
  );

  // 8
  toRet.set(
    C_fn(8),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.kappa,
    ),
  );

  // 9
  toRet.set(
    C_fn(9),
    encodeWithCodec(
      createSequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataCodec),
      state.lambda,
    ),
  );

  // 10
  const rhoCodec = createSequenceCodec(
    CORES,
    new Optional(
      createCodec<NonNullable<RHO[0]>>([
        ["workReport", WorkReportCodec],
        ["reportTime", E_sub_int<Tau>(4)],
      ]),
    ),
  );
  toRet.set(C_fn(10), encodeWithCodec(rhoCodec, state.rho));

  // 11
  toRet.set(C_fn(11), encodeWithCodec(E_4, BigInt(state.tau)));

  // 12
  toRet.set(
    C_fn(12),
    new Uint8Array([
      ...encodeWithCodec(E_4_int, state.privServices.m),
      ...encodeWithCodec(E_4_int, state.privServices.a),
      ...encodeWithCodec(E_4_int, state.privServices.v),
      ...encodeWithCodec(
        buildGenericKeyValueCodec(E_4_int, E_8, (a, b) => a - b),
        state.privServices.g,
      ),
    ]),
  );

  // 13
  toRet.set(
    C_fn(13),
    encodeWithCodec(
      ValidatorStatisticsCodec(NUMBER_OF_VALIDATORS),
      state.validatorStatistics,
    ),
  );

  // 14
  toRet.set(
    C_fn(14),
    encodeWithCodec(
      createSequenceCodec(
        EPOCH_LENGTH,
        createArrayLengthDiscriminator<
          {
            workReport: WorkReport;
            dependencies: Set<WorkPackageHash>;
          }[]
        >({
          encode(value, bytes) {
            let offset = 0;
            offset += WorkReportCodec.encode(value.workReport, bytes);
            offset += createArrayLengthDiscriminator(HashCodec).encode(
              [...value.dependencies].sort((a, b) => (a - b < 0 ? -1 : 1)),
              bytes.subarray(offset),
            );
            return offset;
          },
          decode(bytes) {
            const wr = WorkReportCodec.decode(bytes);
            const deps = createArrayLengthDiscriminator(HashCodec).decode(
              bytes.subarray(wr.readBytes),
            );
            return {
              value: {
                workReport: wr.value,
                dependencies: new Set(deps.value as WorkPackageHash[]),
              },
              readBytes: wr.readBytes + deps.readBytes,
            };
          },
          encodedSize(value) {
            return (
              WorkReportCodec.encodedSize(value.workReport) +
              createArrayLengthDiscriminator(HashCodec).encodedSize([
                ...value.dependencies,
              ])
            );
          },
        }),
      ),
      state.accumulationQueue,
    ),
  );

  // 15 - accumulationHistory
  toRet.set(
    C_fn(15),
    encodeWithCodec(
      createSequenceCodec(
        EPOCH_LENGTH,
        createSetCodec(HashCodec, (a, b) => (a - b < 0 ? -1 : 1)),
      ),
      state.accumulationHistory,
    ),
  );

  for (const [serviceIndex, serviceAccount] of state.serviceAccounts) {
    toRet.set(
      C_fn(255, serviceIndex),
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

    for (const [h, v] of serviceAccount.storage) {
      // TODO: fix
      toRet.set(
        C_fn(serviceIndex, bigintToBytes(h, 32)),
        encodeWithCodec(IdentityCodec, v),
      );
    }

    for (const [h, p] of serviceAccount.preimage_p) {
      // TODO:fix
      toRet.set(
        C_fn(serviceIndex, bigintToBytes(h, 32)),
        encodeWithCodec(IdentityCodec, p),
      );
    }

    for (const [h, lm] of serviceAccount.preimage_l) {
      // TODO:fix
      for (const [l, t] of lm) {
        toRet.set(
          C_fn(
            serviceIndex,
            new Uint8Array([
              ...encodeWithCodec(E_4_int, l),
              ...bigintToBytes(~h as Hash, 32).subarray(4),
            ]),
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
        const m = new Map<bit[], [Hash, Uint8Array]>();
        for (const key in t.input) {
          const keyBuf = Buffer.from(`${key}`, "hex");
          const keyBits = bits(keyBuf);
          const keyHash: Hash = bytesToBigInt(keyBuf);
          const value = Buffer.from(t.input[key], "hex");
          m.set(keyBits, [keyHash, value]);
        }
        const res = M_fn(m);
        expect(Buffer.from(bigintToBytes(res, 32)).toString("hex")).eq(
          t.output,
        );
      }
    });
  });
}
