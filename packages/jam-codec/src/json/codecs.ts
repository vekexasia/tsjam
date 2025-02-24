import {
  AuthorizerPool,
  AuthorizerQueue,
  GammaSFallback,
  GammaSNormal,
  Hash,
  JamEntropy,
  JamState,
  RecentHistory,
  RecentHistoryItem,
  RHO,
  SafroleState,
  TicketIdentifier,
  ValidatorData,
} from "@tsjam/types";
import { JSONCodec } from "./JsonCodec";
import { hexToBytes, hextToBigInt, isFallbackMode } from "@tsjam/utils";
import { encodeWithCodec } from "@/utils";
import { HashCodec } from "@/identity";
import { ValidatorDataCodec } from "@/validatorDataCodec";

const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString("hex")}`;

const hashToHex = <T extends Hash>(h: T) =>
  `${bufToHex(encodeWithCodec(HashCodec, h))}`;

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

export const RecentHistoryCodec: JSONCodec<
  RecentHistory,
  Array<{
    header_hash: string;
    mmr: { peaks: Array<null | string> };
    state_root: string;
    reported: Array<{ work_package_hash: string; segment_tree_root: string }>;
  }>
> = {
  fromJSON(json) {
    return <RecentHistory>json.map((item) => {
      return <RecentHistoryItem>{
        headerHash: hextToBigInt(item.header_hash),
        accumulationResultMMR: item.mmr.peaks.map((item) => {
          if (item == null) {
            return undefined;
          } else {
            return hextToBigInt(item);
          }
        }),
        stateRoot: hextToBigInt(item.state_root),
        reportedPackages: new Map(
          item.reported.map((a) => [
            hextToBigInt(a.work_package_hash),
            hextToBigInt(a.segment_tree_root),
          ]),
        ),
      };
    });
  },

  toJSON(value) {
    return value.map((item) => {
      return {
        header_hash: hashToHex(item.headerHash),
        mmr: {
          peaks: item.accumulationResultMMR.map((item) => {
            if (typeof item === "undefined") {
              return null;
            }
            return hashToHex(item);
          }),
        },
        state_root: hashToHex(item.stateRoot),
        reported: [...item.reportedPackages.entries()].map(([wph, str]) => ({
          work_package_hash: hashToHex(wph),
          segment_tree_root: hashToHex(str),
        })),
      };
    });
  },
};

const ValidatorDataJSONCodec: JSONCodec<
  Array<ValidatorData>,
  Array<{
    bandersnatch: string;
    ed25519: string;
    bls: string;
    metadata: string;
  }>
> = {
  fromJSON(json) {
    return json.map((item) => {
      return <ValidatorData>{
        banderSnatch: hexToBytes(item.bandersnatch),
        ed25519: hextToBigInt(item.ed25519),
        metadata: hexToBytes(item.metadata),
        blsKey: hexToBytes(item.bls),
      };
    });
  },

  toJSON(value) {
    return value.map((item) => {
      const b = encodeWithCodec(ValidatorDataCodec, item);
      return {
        bandersnatch: bufToHex(b.subarray(0, 32)),
        ed25519: bufToHex(b.subarray(32, 64)),
        metadata: bufToHex(b.subarray(64, 64 + 144)),
        bls: bufToHex(b.subarray(64 + 144)),
      };
    });
  },
};
const buildValidatorDataJSONCodec = <T extends Array<ValidatorData>>() => {
  return <
    JSONCodec<
      T,
      Array<{
        bandersnatch: string;
        ed25519: string;
        bls: string;
        metadata: string;
      }>
    >
  >ValidatorDataJSONCodec;
};

export const GammaKJsonCodec = buildValidatorDataJSONCodec<
  SafroleState["gamma_k"]
>;

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

export const GammaAJsonCodec: JSONCodec<
  SafroleState["gamma_a"],
  { tickets: Array<{ id: string; attempt: number }> }
> = {
  fromJSON(json) {
    // means tickets are there
    return <SafroleState["gamma_a"]>json.tickets.map((ticket) => {
      const t: TicketIdentifier = {
        id: hextToBigInt(ticket.id),
        attempt: <0 | 1>ticket.attempt,
      };
      return t;
    });
  },

  toJSON(value) {
    return {
      tickets: value.map((v) => ({
        id: hashToHex(v.id),
        attempt: v.attempt,
      })),
    };
  },
};

//TODO: psi/DisputesState

export const EntropyJSONCodec: JSONCodec<JamEntropy, string[]> = {
  fromJSON(json) {
    return <JamEntropy>json.map((a) => hextToBigInt(a));
  },
  toJSON(value) {
    return value.map((a) => hashToHex(a));
  },
};

export const IOTAJSONCodec = buildValidatorDataJSONCodec<JamState["iota"]>();
export const KappaJSONCodec = buildValidatorDataJSONCodec<JamState["kappa"]>();
export const LambdaJSONCodec =
  buildValidatorDataJSONCodec<JamState["lambda"]>();

type JSONWorkReport = {
  package_spec: {
    hash: string;
    length: number;
    erasure_root: string;
    exports_root: string;
    exports_count: number;
  };
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
  segment_root_lookup: string[];
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
          package_spec: {
            hash: hashToHex(
              item.workReport.workPackageSpecification.workPackageHash,
            ),
            length: item.workReport.workPackageSpecification.bundleLength,
            erasure_root: hashToHex(
              item.workReport.workPackageSpecification.erasureRoot,
            ),
            exports_root: hashToHex(
              item.workReport.workPackageSpecification.segmentRoot,
            ),
            exports_count:
              item.workReport.workPackageSpecification.segmentCount,
          },
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
        },
        timeout: item.reportTime,
      };
    });
  },
  fromJSON(json) {},
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
