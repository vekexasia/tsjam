import {
  createCodec,
  BandersnatchCodec,
  BandersnatchRingRootCodec,
  E_1,
  HashCodec,
  JamCodec,
  TicketIdentifierCodec,
  ValidatorDataCodec,
  createArrayLengthDiscriminator,
  RecentHistoryCodec,
  Ed25519PubkeyBigIntCodec,
  E_M,
  Blake2bHashCodec,
  createSequenceCodec,
  create32BCodec,
  E_sub,
  E_sub_int,
  genericBytesBigIntCodec,
  createLengthDiscrimantedSetCodec,
  MapJSONCodec,
  Uint8ArrayJSONCodec,
  JSONCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Beta,
  BigIntBytes,
  CodeHash,
  Gas,
  Hash,
  IDisputesState,
  JamEntropy,
  JamState,
  SafroleState,
  ServiceAccount,
  ServiceIndex,
  StateKey,
  u32,
  u64,
} from "@tsjam/types";
import { isFallbackMode } from "@tsjam/utils";

export const betaCodec = createCodec<Beta>([
  ["recentHistory", RecentHistoryCodec],
  ["beefyBelt", E_M],
]);

export const safroleCodec = createCodec<SafroleState>([
  [
    "gamma_k",
    createSequenceCodec<SafroleState["gamma_k"]>(
      NUMBER_OF_VALIDATORS,
      ValidatorDataCodec,
    ),
  ],
  [
    "gamma_z",
    BandersnatchRingRootCodec as unknown as JamCodec<SafroleState["gamma_z"]>,
  ],
  [
    "gamma_s",
    {
      decode(bytes: Uint8Array) {
        const isFallback = E_1.decode(bytes.subarray(0, 1)).value === 1n;
        const codec = isFallback ? BandersnatchCodec : TicketIdentifierCodec;
        const { value, readBytes } = createSequenceCodec<
          SafroleState["gamma_s"]
        >(EPOCH_LENGTH, codec as unknown as JamCodec<any>).decode(
          bytes.subarray(1),
        );
        return { value, readBytes };
      },

      encodedSize(v: SafroleState["gamma_s"]): number {
        if (isFallbackMode(v)) {
          return (
            1 +
            createSequenceCodec<typeof v>(
              EPOCH_LENGTH,
              BandersnatchCodec,
            ).encodedSize(v)
          );
        } else {
          return (
            1 +
            createSequenceCodec<typeof v>(
              EPOCH_LENGTH,
              TicketIdentifierCodec,
            ).encodedSize(v)
          );
        }
      },

      encode(v: SafroleState["gamma_s"], bytes: Uint8Array): number {
        if (isFallbackMode(v)) {
          E_1.encode(1n, bytes);
          return (
            1 +
            createSequenceCodec<typeof v>(
              EPOCH_LENGTH,
              BandersnatchCodec,
            ).encode(v, bytes.subarray(1))
          );
        } else {
          E_1.encode(0n, bytes);
          return (
            1 +
            createSequenceCodec<typeof v>(
              EPOCH_LENGTH,
              TicketIdentifierCodec,
            ).encode(v, bytes.subarray(1))
          );
        }
      },
    },
  ],
  [
    "gamma_a",
    createArrayLengthDiscriminator<SafroleState["gamma_a"]>(
      TicketIdentifierCodec,
    ),
  ],
]);

export const disputesCodec = createCodec<IDisputesState>([
  [
    "psi_g",
    createLengthDiscrimantedSetCodec(HashCodec, (a, b) => (a - b < 0 ? -1 : 1)),
  ],
  [
    "psi_b",
    createLengthDiscrimantedSetCodec(HashCodec, (a, b) => (a - b < 0 ? -1 : 1)),
  ],
  [
    "psi_w",
    createLengthDiscrimantedSetCodec(HashCodec, (a, b) => (a - b < 0 ? -1 : 1)),
  ],
  [
    "psi_o",
    createLengthDiscrimantedSetCodec(Ed25519PubkeyBigIntCodec, (a, b) =>
      a - b < 0 ? -1 : 1,
    ),
  ],
]);

export const entropyCodec: JamCodec<JamEntropy> = {
  encode(v: JamEntropy, bytes: Uint8Array): number {
    let offset = 0;
    for (const e of v) {
      offset += Blake2bHashCodec.encode(e, bytes.subarray(offset));
    }
    return offset;
  },
  decode(bytes) {
    const e0 = Blake2bHashCodec.decode(bytes.subarray(0, 32)).value;
    const e1 = Blake2bHashCodec.decode(bytes.subarray(32, 64)).value;
    const e2 = Blake2bHashCodec.decode(bytes.subarray(64, 96)).value;
    const e3 = Blake2bHashCodec.decode(bytes.subarray(96, 128)).value;
    return { value: [e0, e1, e2, e3], readBytes: 128 };
  },
  encodedSize() {
    return 128; // 4 * 32 bytes
  },
};

export const serviceAccountDataCodec = createCodec<
  Pick<
    ServiceAccount,
    | "codeHash"
    | "balance"
    | "minGasAccumulate"
    | "minGasOnTransfer"
    | "gratisStorageOffset"
    | "creationTimeSlot"
    | "lastAccumulationTimeSlot"
    | "parentService"
  > & {
    totalOctets: u64;
    itemInStorage: u32;
  }
>([
  ["codeHash", create32BCodec<CodeHash>()],
  ["balance", E_sub<u64>(8)],
  ["minGasAccumulate", E_sub<Gas>(8)],
  ["minGasOnTransfer", E_sub<Gas>(8)],
  ["totalOctets", E_sub<u64>(8)],
  ["gratisStorageOffset", E_sub<u64>(8)],
  ["itemInStorage", E_sub_int<u32>(4)],
  ["creationTimeSlot", E_sub_int<u32>(4)],
  ["lastAccumulationTimeSlot", E_sub_int<u32>(4)],
  ["parentService", E_sub_int<ServiceIndex>(4)],
]);

export const thetaCodec = createArrayLengthDiscriminator<
  JamState["mostRecentAccumulationOutputs"]
>(
  createCodec<{
    serviceIndex: ServiceIndex;
    accumulationResult: Hash;
  }>([
    ["serviceIndex", E_sub_int<ServiceIndex>(4)],
    ["accumulationResult", HashCodec],
  ]),
);
export const stateKeyCodec = genericBytesBigIntCodec<StateKeyBigInt, 31>(31);

export type StateKeyBigInt = BigIntBytes<31>;

export const traceJSONCodec = MapJSONCodec(
  { key: "key", value: "value" },
  Uint8ArrayJSONCodec as JSONCodec<StateKey, string>,
  Uint8ArrayJSONCodec,
);
