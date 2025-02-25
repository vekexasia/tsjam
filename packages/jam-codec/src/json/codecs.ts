import type {
  AuthorizerPool,
  AuthorizerQueue,
  AvailabilitySpecification,
  type BandersnatchKey,
  Blake2bHash,
  type BLSKey,
  type ByteArrayOfLength,
  CoreIndex,
  type ED25519PublicKey,
  GammaSFallback,
  GammaSNormal,
  Gas,
  Hash,
  type HeaderHash,
  JamEntropy,
  JamState,
  type OpaqueHash,
  RecentHistoryItem,
  RHO,
  SafroleState,
  ServiceIndex,
  type StateRootHash,
  Tagged,
  TicketIdentifier,
  u16,
  ValidatorData,
  type WorkPackageHash,
} from "@tsjam/types";
import {
  BaseJSONCodec,
  JSONCodec,
  JSONCodecClass,
  JSONProperty,
} from "./JsonCodec";
import { hexToBytes, hextToBigInt, isFallbackMode } from "@tsjam/utils";
import { encodeWithCodec } from "@/utils";
import { Ed25519PubkeyCodec, HashCodec } from "@/identity";
import { ValidatorDataCodec } from "@/validatorDataCodec";
import assert from "node:assert";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";

const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

const hashToHex = <T extends Hash>(h: T) =>
  `${bufToHex(encodeWithCodec(HashCodec, h))}`;

export const BigIntJSONCodec = <T extends bigint>(): JSONCodec<T, number> => {
  return {
    fromJSON(json) {
      return <T>BigInt(json);
    },
    toJSON(value) {
      return Number(value); // TODO: this might fail due to loss in precision
    },
  };
};

export const NumberJSONCodec = <T extends number>(): JSONCodec<T, number> => {
  return {
    fromJSON(json) {
      return <T>json;
    },
    toJSON(value) {
      return value;
    },
  };
};

export const HashJSONCodec = <T extends Hash>(): JSONCodec<Hash, string> => {
  return {
    toJSON(value) {
      return hashToHex(value);
    },
    fromJSON(json) {
      return hextToBigInt<T, 32>(json);
    },
  };
};

export const Ed25519JSONCodec = (): JSONCodec<ED25519PublicKey, string> => {
  return {
    toJSON(value) {
      return bufToHex(encodeWithCodec(Ed25519PubkeyCodec, value));
    },
    fromJSON(json) {
      return hextToBigInt<ED25519PublicKey, 32>(json);
    },
  };
};

export const BufferJSONCodec = <
  T extends ByteArrayOfLength<K>,
  K extends number,
>(): JSONCodec<T, string> => {
  return {
    fromJSON(json) {
      return hexToBytes(json);
    },
    toJSON(value) {
      return bufToHex(value);
    },
  };
};

export const ArrayOfJSONCodec = <K extends T[], T>(
  singleCodec: JSONCodec<T>,
): JSONCodec<K, any[]> => {
  return {
    fromJSON(json) {
      return <K>json.map((item) => singleCodec.fromJSON(item));
    },
    toJSON(value) {
      return value.map((item) => singleCodec.toJSON(item));
    },
  };
};

export const MapJSONCoec = <K, V, KN extends string, VN extends string>(
  jsonKeys: {
    key: KN;
    value: VN;
  },
  keyCodec: JSONCodec<K, any>,
  valueCodec: JSONCodec<V, any>,
): JSONCodec<Map<K, V>, Array<{ [key in KN | VN]: any }>> => {
  return {
    fromJSON(json) {
      return new Map<K, V>(
        json.map((item) => [
          keyCodec.fromJSON(item[jsonKeys.key]),
          valueCodec.fromJSON(item[jsonKeys.value]),
        ]),
      );
    },
    toJSON(value) {
      return <any>[...value.entries()].map(([key, value]) => ({
        [jsonKeys.key]: keyCodec.toJSON(key),
        [jsonKeys.value]: valueCodec.toJSON(value),
      }));
    },
  };
};

export const WrapJSONCodec = <T, K extends string>(
  key: K,
  codec: JSONCodec<T, any>,
): JSONCodec<T, { [key in K]: any }> => {
  return {
    fromJSON(json) {
      return codec.fromJSON(json[key]);
    },
    toJSON(value) {
      return <{ [key in K]: any }>{
        [key]: codec.toJSON(value),
      };
    },
  };
};

export const NULLORCodec = <T>(
  tCodec: JSONCodec<T, unknown>,
): JSONCodec<T | undefined, unknown | null> => {
  return {
    fromJSON(json) {
      if (json === null) {
        return undefined;
      }
      return tCodec.fromJSON(json);
    },
    toJSON(value) {
      if (typeof value === "undefined") {
        return null;
      }
      return tCodec.toJSON(value);
    },
  };
};

// util to extract types from jsoncodec
type ExtractNativeType<T> =
  T extends JSONCodec<infer First, any> ? First : never;
type ExtractJSONType<T> =
  T extends JSONCodec<any, infer Second> ? Second : never;

export const AuthPoolJsonCodec: JSONCodec<AuthorizerPool> = {
  fromJSON(json: string[][]) {
    return <AuthorizerPool>(
      json.map((s) => s.map((s1) => hextToBigInt<Hash, 32>(s1)))
    );
  },

  toJSON(value) {
    return value.map((s) =>
      s.map(
        (s1) =>
          `0x${Buffer.from(encodeWithCodec(HashCodec, s1)).toString("hex")}`,
      ),
    );
  },
};

export const AuthQueueJsonCodec: JSONCodec<AuthorizerQueue> = {
  fromJSON(json: string[][]) {
    return <AuthorizerQueue>(
      json.map((s) => s.map((s1) => hextToBigInt<Hash, 32>(s1)))
    );
  },
  toJSON(value) {
    return value.map((s) => s.map((s1) => hashToHex(s1)));
  },
};

@JSONCodecClass
export class RecentHistoryItemJSON
  extends BaseJSONCodec<RecentHistoryItemJSON>
  implements RecentHistoryItem
{
  @JSONProperty("header_hash", HashJSONCodec())
  headerHash!: HeaderHash;

  @JSONProperty(
    "mmr",
    WrapJSONCodec("peaks", ArrayOfJSONCodec(NULLORCodec(HashJSONCodec()))),
  )
  accumulationResultMMR!: (Hash | undefined)[];

  @JSONProperty("state_root", HashJSONCodec())
  stateRoot!: StateRootHash;

  @JSONProperty(
    "reported",
    MapJSONCoec(
      { key: "work_package_hash", value: "segment_tree_root" },
      HashJSONCodec(),
      HashJSONCodec(),
    ),
  )
  reportedPackages!: Map<WorkPackageHash, Hash>;
}
export const RecentHistoryCodec = ArrayOfJSONCodec(new RecentHistoryItemJSON());

@JSONCodecClass
export class ValidatorDataJSON
  extends BaseJSONCodec<ValidatorDataJSON>
  implements ValidatorData
{
  @JSONProperty("bandersnatch", BufferJSONCodec())
  banderSnatch!: BandersnatchKey;

  @JSONProperty("ed25519", Ed25519JSONCodec())
  ed25519!: ED25519PublicKey;

  @JSONProperty("bls", BufferJSONCodec())
  blsKey!: BLSKey;

  @JSONProperty("metadata", BufferJSONCodec())
  metadata!: ByteArrayOfLength<128>;
}

export const GammaKJsonCodec = ArrayOfJSONCodec<
  SafroleState["gamma_k"],
  ValidatorData
>(new ValidatorDataJSON());

export const GammaSJsonCodec: JSONCodec<
  SafroleState["gamma_s"],
  { keys: string[] } | { tickets: Array<{ id: string; attempt: number }> }
> = {
  fromJSON(json) {
    if ("keys" in json) {
      return <GammaSFallback>json.keys.map((key) => hexToBytes(key));
    }

    // means tickets are there
    return <GammaSNormal>json.tickets.map((ticket) => {
      const t: TicketIdentifier = {
        id: hextToBigInt(ticket.id),
        attempt: <0 | 1>ticket.attempt,
      };
      return t;
    });
  },

  toJSON(value) {
    if (isFallbackMode(value)) {
      return { keys: value.map((banderkey) => bufToHex(banderkey)) };
    } else {
      return {
        tickets: value.map((v) => ({
          id: hashToHex(v.id),
          attempt: v.attempt,
        })),
      };
    }
  },
};

@JSONCodecClass
export class TicketIdentifierJSON
  extends BaseJSONCodec<TicketIdentifierJSON>
  implements TicketIdentifier
{
  @JSONProperty("id", HashJSONCodec())
  public id!: OpaqueHash;
  @JSONProperty("attempt", NumberJSONCodec())
  public attempt!: 0 | 1;
}

export const GammaAJsonCodec = WrapJSONCodec(
  "tickets",
  ArrayOfJSONCodec<SafroleState["gamma_a"], TicketIdentifier>(
    new TicketIdentifierJSON(),
  ),
);

//TODO: psi/DisputesState

export const EntropyJSONCodec = ArrayOfJSONCodec<JamEntropy, Blake2bHash>(
  BigIntJSONCodec(),
);

export const IOTAJSONCodec = ArrayOfJSONCodec<JamState["iota"], ValidatorData>(
  new ValidatorDataJSON(),
);

export const KappaJSONCodec = ArrayOfJSONCodec<
  JamState["kappa"],
  ValidatorData
>(new ValidatorDataJSON());

export const LambdaJSONCodec = ArrayOfJSONCodec<
  JamState["lambda"],
  ValidatorData
>(new ValidatorDataJSON());

@JSONCodecClass
export class AvailabilitySpecificationJSON
  extends BaseJSONCodec<AvailabilitySpecificationJSON>
  implements AvailabilitySpecification
{
  @JSONProperty("hash", HashJSONCodec())
  public workPackageHash!: WorkPackageHash;

  @JSONProperty("length", NumberJSONCodec())
  public bundleLength!: Tagged<
    number,
    "l",
    { maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR }
  >;

  @JSONProperty("erasure_root", HashJSONCodec())
  public erasureRoot!: Hash;

  @JSONProperty("exports_root", HashJSONCodec())
  public segmentRoot!: Hash;

  @JSONProperty("exports_count", NumberJSONCodec())
  public segmentCount!: u16;
}

export const AvailabilitySpecJSONCodec: JSONCodec<
  AvailabilitySpecification,
  {
    hash: string;
    length: number;
    erasure_root: string;
    exports_root: string;
    exports_count: number;
  }
> = {
  fromJSON(json) {
    return {
      workPackageHash: hextToBigInt(json.hash),
      bundleLength: <AvailabilitySpecification["bundleLength"]>json.length,
      erasureRoot: hextToBigInt(json.erasure_root),
      segmentRoot: hextToBigInt(json.exports_root),
      segmentCount: <u16>json.exports_count,
    };
  },
  toJSON(value) {
    return {
      hash: hashToHex(value.workPackageHash),
      length: value.bundleLength,
      erasure_root: hashToHex(value.erasureRoot),
      exports_root: hashToHex(value.segmentRoot),
      exports_count: value.segmentCount,
    };
  },
};
type JSONWorkReport = {
  package_spec: ExtractJSONType<typeof AvailabilitySpecJSONCodec>;
  context: {
    anchor: string;
    state_root: string;
    beefy_root: string;
    lookup_anchor: string;
    lookup_anchor_slot: number;
    prerequisites: string[];
  };
  core_index: number;
  authorizer_hash: string;
  auth_output: string;
  segment_root_lookup: Array<{
    work_package_hash: string;
    segment_tree_root: string;
  }>;
  results: Array<{
    service_id: number;
    code_hash: string;
    payload_hash: string;
    accumulate_gas: number;
    result: {
      ok: string;
    };
  }>;
};

export const RHOJSONCodec: JSONCodec<
  RHO,
  Array<null | { report: JSONWorkReport; timeout: number }>
> = {
  toJSON(value) {
    return value.map((item) => {
      if (typeof item === "undefined") {
        return null;
      }
      return {
        report: {
          package_spec: AvailabilitySpecJSONCodec.toJSON(
            item.workReport.workPackageSpecification,
          ),
          context: {
            anchor: hashToHex(item.workReport.refinementContext.anchor.hash),
            state_root: hashToHex(
              item.workReport.refinementContext.anchor.stateRoot,
            ),
            beefy_root: hashToHex(
              item.workReport.refinementContext.anchor.beefyRoot,
            ),
            lookup_anchor: hashToHex(
              item.workReport.refinementContext.lookupAnchor.hash,
            ),
            lookup_anchor_slot:
              item.workReport.refinementContext.lookupAnchor.timeSlot,
            prerequisites: item.workReport.refinementContext.dependencies.map(
              (wph) => hashToHex(wph),
            ),
          },
          core_index: item.workReport.coreIndex,
          authorizer_hash: hashToHex(item.workReport.authorizerHash),
          auth_output: bufToHex(item.workReport.authorizerOutput),
          segment_root_lookup: [
            ...item.workReport.segmentRootLookup.entries(),
          ].map(([wph, str]) => ({
            work_package_hash: hashToHex(wph),
            segment_tree_root: hashToHex(str),
          })),
          results: item.workReport.results.map((res) => {
            return {
              service_id: res.serviceIndex,
              code_hash: hashToHex(res.codeHash),
              payload_hash: hashToHex(res.payloadHash),
              accumulate_gas: Number(res.gasPrioritization),
              result: (() => {
                if (res.output instanceof Uint8Array) {
                  return { ok: bufToHex(res.output) };
                } else {
                  // FIXME: missing
                  return { ok: "" };
                }
              })(),
            };
          }),
        },
        timeout: item.reportTime,
      };
    });
  },
  fromJSON(json) {
    return json.map((item) => {
      if (item === null) {
        return undefined;
      }
      return {
        reportTime: item.timeout,
        workReport: {
          workPackageSpecification: AvailabilitySpecJSONCodec.fromJSON(
            item.report.package_spec,
          ),
          refinementContext: {},
          coreIndex: <CoreIndex>item.report.core_index,
          authorizerHash: hextToBigInt(item.report.authorizer_hash),
          authorizerOutput: hexToBytes(item.report.auth_output),
          segmentRootLookup: new Map(
            item.report.segment_root_lookup.map((a) => [
              hextToBigInt(a.work_package_hash),
              hextToBigInt(a.segment_tree_root),
            ]),
          ),
          results: item.report.results.map((res) => {
            return {
              serviceIndex: <ServiceIndex>res.service_id,
              codeHash: hextToBigInt(res.code_hash),
              payloadHash: hextToBigInt(res.payload_hash),
              gasPrioritization: <Gas>BigInt(res.accumulate_gas),
              output: (() => {
                assert(
                  typeof res.result.ok !== "undefined",
                  "result not ok not implemented",
                );
                return hexToBytes(res.result.ok);
              })(),
            };
          }),
        },
      };
    });
  },
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("aaa", () => {
    it("ciao", () => {
      const x = AuthPoolJsonCodec.fromJSON([
        [
          "0x1000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
        [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ],
      ]);
    });
  });
}
