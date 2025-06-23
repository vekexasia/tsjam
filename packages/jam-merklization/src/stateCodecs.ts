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
const EPOCH_LENGTH = <any>12;
const NUMBER_OF_VALIDATORS = <any>6;

export const safroleCodec = createCodec<SafroleState>([
  [
    "gamma_k",
    createSequenceCodec<SafroleState["gamma_k"]>(<any>6, ValidatorDataCodec),
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
        >(<any>12, codec as unknown as JamCodec<any>).decode(bytes.subarray(1));
        return { value, readBytes };
      },

      encodedSize(v: SafroleState["gamma_s"]): number {
        if (isFallbackMode(v)) {
          return (
            1 +
            createSequenceCodec<typeof v>(
              <any>12,
              BandersnatchCodec,
            ).encodedSize(v)
          );
        } else {
          return (
            1 +
            createSequenceCodec<typeof v>(
              <any>12,
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

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("merkle state codecs", () => {
    it("boh", () => {
      const safroleEncoded = Buffer.from(
        "ff71c6c03ff88adb5ed52c9681de1629a54e702fc14729f6b50d2f0a76f185b34418fb8c85bb3985394a8c2756d3643457ce614546202a2f50b093d762499ace00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001409c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91ad93247bd01307550ec7acd757ce6fb805fcf73db364063265b30a949e90d93300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001419c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b66cab2b9ff25c2410fbe9b8a717abb298c716a03983c98ceb4def2087500b8e34100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001429c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981ccf30aa5444688b3cab47697b37d5cac5707bb3289e986b19b17db437206931a8d00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001439c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000151e5c8fe2b9d8a606966a79edd2f9e5db47e83947ce368ccba53bf6ba20a40b8b8c5d436f92ecf605421e873a99ec528761eb52a88a2f9a057b3b3003e6f32a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001449c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002105650944fcd101621fd5bb3124c9fd191d114b7ad936c1d79d734f9f21392eab0084d01534b31c1dd87c81645fd762482a90027754041ca1b56133d0466c0600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffff7f000001459c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000af39b7de5fcfb9fb8a46b1645310529ce7d08af7301d9758249da4724ec698eb127f489b58e49ae9ab85027509116962a135fc4d97b66fbbed1d3df88cd7bf5cc6e5d7391d261a4b552246648defcb64ad440d61d69ec61b5473506a48d58e1992e630ae2b14e758ab0960e372172203f4c9a41777dadd529971d7ab9d23ab29fe0e9c85ec450505dde7f5ac038274cf010746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981ccff71c6c03ff88adb5ed52c9681de1629a54e702fc14729f6b50d2f0a76f185b30746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981ccdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91ff71c6c03ff88adb5ed52c9681de1629a54e702fc14729f6b50d2f0a76f185b3151e5c8fe2b9d8a606966a79edd2f9e5db47e83947ce368ccba53bf6ba20a40b9326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b66dee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b919326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b662105650944fcd101621fd5bb3124c9fd191d114b7ad936c1d79d734f9f21392e2105650944fcd101621fd5bb3124c9fd191d114b7ad936c1d79d734f9f21392edee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b9100",
        "hex",
      );

      const decoded = safroleCodec.decode(safroleEncoded).value;
      console.log(decoded);
    });
  });
}
