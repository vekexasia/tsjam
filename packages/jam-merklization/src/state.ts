/**
 * Appendix D
 */

import {
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  BandersnatchCodec,
  BandersnatchRingRootCodec,
  E_1,
  E_1_int,
  E_4,
  E_4_int,
  E_8,
  E_M,
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
  encodeWithCodec,
} from "@tsjam/codec";
import { CORES, EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Hash,
  JamState,
  MerkeTreeRoot,
  RecentHistoryItem,
  ServiceIndex,
  SingleValidatorStatistics,
  Tau,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import {
  bigintToBytes,
  bytesToBigInt,
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/utils";
import { createSequenceCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import assert from "node:assert";

/**
 * 318 merkelize state
 * `Mσ`
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
    .map((a) => a.toString(2).padStart(8, "0").split("").map(parseInt))
    .flat();
  return a as bit[];
};

const bits_inv = (bits: bit[]): Uint8Array => {
  assert(bits.length % 8 === 0);
  const bytes = [];
  for (let i = 0; i < bits.length / 8; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8).join(""), 2);
  }
  return new Uint8Array(bytes);
};

const B_fn = (l: Hash, r: Hash): bit[] => {
  const lb = bigintToBytes(l, 32);
  const rb = bigintToBytes(r, 32);
  return [0, ...bits(lb).slice(1), ...bits(rb)];
};

const L_fn = (k: Hash, v: Uint8Array): bit[] => {
  if (v.length <= 32) {
    return [
      1,
      0,
      ...bits(encodeWithCodec(E_1_int, v.length)).slice(0, 5),
      ...bits(bigintToBytes(k, 32)).slice(0, 247),
      ...bits(v),
      ...new Array(v.length - 32).fill(0),
    ];
  } else {
    return [
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      ...bits(bigintToBytes(k, 32)).slice(0, 247),
      ...bits(Hashing.blake2bBuf(v)),
    ];
  }
};

const M_fn = (d: Map<bit[], [Hash, Uint8Array]>): Hash => {
  if (d.size === 0) {
    return 0n as Hash;
  } else if (d.size === 1) {
    const [[k, v]] = d.values();
    return Hashing.blake2b(bits_inv(L_fn(k, v)));
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
    return Hashing.blake2b(bits_inv(B_fn(M_fn(l), M_fn(r))));
  }
};

/**
 * (314) in graypaper
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
      ]),
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

const transformState = (state: JamState): Map<Hash, Uint8Array> => {
  const toRet = new Map<Hash, Uint8Array>();

  toRet.set(C_fn(1), encodeWithCodec(AuthorizerPoolCodec, state.authPool));
  toRet.set(C_fn(2), encodeWithCodec(AuthorizerQueueCodec, state.authQueue));

  // β - recentHistory
  toRet.set(
    C_fn(3),
    encodeWithCodec(
      createArrayLengthDiscriminator(singleHistoryItemCodec),
      state.recentHistory,
    ),
  );

  const gamma_sCodec = createSequenceCodec(
    EPOCH_LENGTH,
    typeof state.safroleState.gamma_s[0] === "bigint"
      ? (BandersnatchCodec as JamCodec<unknown>)
      : (TicketIdentifierCodec as JamCodec<unknown>),
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

  const singleRHOCodec: JamCodec<{ workReport: WorkReport; reportTime: Tau }> =
    {
      encode(value, bytes) {
        let offset = 0;
        offset += WorkReportCodec.encode(value.workReport, bytes);
        offset += E_4.encode(BigInt(value.reportTime), bytes.subarray(offset));
        return offset;
      },
      decode(bytes) {
        const wr = WorkReportCodec.decode(bytes);
        const rt = E_4.decode(bytes.subarray(wr.readBytes));
        return {
          value: { workReport: wr.value, reportTime: Number(rt.value) as Tau },
          readBytes: wr.readBytes + rt.readBytes,
        };
      },
      encodedSize(value) {
        return (
          WorkReportCodec.encodedSize(value.workReport) +
          E_4.encodedSize(BigInt(value.reportTime))
        );
      },
    };

  const rhoCodec = createSequenceCodec(CORES, new Optional(singleRHOCodec));
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

  const svscodec: JamCodec<SingleValidatorStatistics> = {
    encode(value, bytes) {
      let offset = 0;
      offset += E_4_int.encode(value.blocksProduced, bytes.subarray(offset));
      offset += E_4_int.encode(value.ticketsIntroduced, bytes.subarray(offset));
      offset += E_4_int.encode(
        value.preimagesIntroduced,
        bytes.subarray(offset),
      );
      offset += E_4_int.encode(
        value.totalOctetsIntroduced,
        bytes.subarray(offset),
      );
      offset += E_4_int.encode(value.guaranteedReports, bytes.subarray(offset));
      offset += E_4_int.encode(
        value.availabilityAssurances,
        bytes.subarray(offset),
      );
      return offset;
    },
    decode(bytes) {
      const blocksProduced = E_4_int.decode(bytes);
      const ticketsIntroduced = E_4_int.decode(bytes.subarray(4));
      const preimagesIntroduced = E_4_int.decode(bytes.subarray(8));
      const totalOctetsIntroduced = E_4_int.decode(bytes.subarray(12));
      const guaranteedReports = E_4_int.decode(bytes.subarray(16));
      const availabilityAssurances = E_4_int.decode(bytes.subarray(20));

      return {
        value: {
          blocksProduced: blocksProduced.value,
          ticketsIntroduced: ticketsIntroduced.value,
          preimagesIntroduced: preimagesIntroduced.value,
          totalOctetsIntroduced: totalOctetsIntroduced.value,
          guaranteedReports: guaranteedReports.value,
          availabilityAssurances: availabilityAssurances.value,
        },
        readBytes: 24,
      };
    },
    encodedSize() {
      return 0;
    },
  };

  // 13
  toRet.set(
    C_fn(13),
    encodeWithCodec(
      createSequenceCodec(
        2,
        createSequenceCodec(NUMBER_OF_VALIDATORS, svscodec),
      ),
      state.validatorStatistics,
    ),
  );

  // 14
  toRet.set(
    C_fn(14),
    encodeWithCodec(
      createSequenceCodec(
        EPOCH_LENGTH,
        createArrayLengthDiscriminator<{
          workReport: WorkReport;
          dependencies: Set<WorkPackageHash>;
        }>({
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
        buildGenericKeyValueCodec(HashCodec, HashCodec, (a, b) =>
          a - b < 0 ? -1 : 1,
        ),
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
      toRet.set(
        C_fn(serviceIndex, bigintToBytes(h, 32)),
        encodeWithCodec(IdentityCodec, v),
      );
    }

    for (const [h, p] of serviceAccount.preimage_p) {
      toRet.set(
        C_fn(serviceIndex, bigintToBytes(h, 32)),
        encodeWithCodec(IdentityCodec, p),
      );
    }

    for (const [h, lm] of serviceAccount.preimage_l) {
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
