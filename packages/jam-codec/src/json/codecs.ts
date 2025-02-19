import {
  AuthorizerPool,
  AuthorizerQueue,
  BandersnatchKey,
  Hash,
  RecentHistory,
  RecentHistoryItem,
  SafroleState,
  ValidatorData,
} from "@tsjam/types";
import { JSONCodec } from "./JsonCodec";
import { hexToBytes, hextToBigInt } from "@tsjam/utils";
import { encodeWithCodec } from "@/utils";
import { HashCodec } from "@/identity";
import { ValidatorDataCodec } from "@/validatorDataCodec";

const bufToHex = (b: Uint8Array) => `0x${Buffer.from(b).toString(hex)}`;
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
    reported: string[];
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
        reportedPackages: new Map(), // TODO:
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
        reported: [], //TODO:
      };
    });
  },
};

const ValidatorDataCodec: JSONCodec<
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
        banderSnatch: hextToBigInt<BandersnatchKey, 32>(item.bandersnatch),
        ed25519: hextToBigInt(item.ed25519),
        metadata: hextToBigInt(item.metadata),
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
export const GammaKJsonCodec: JSONCodec<
  SafroleState["gamma_k"],
  Array<{
    bandersnatch: string;
    ed25519: string;
    bls: string;
    metadata: string;
  }>
> = {
  fromJSON(json) {
    return <SafroleState["gamma_k"]>json.map((item) => ({
      banderSnatch: hextToBigInt(item.bandersnatch),
      ed25519: hextToBigInt(item.ed25519),
      metadata: hextToBigInt(item.metadata),
      blsKey: hextToBigInt(item.bls),
    }));
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
