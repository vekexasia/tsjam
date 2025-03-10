import { describe, expect, it } from "vitest";
import fs from "fs";
import {
  AuthorizerPoolJSONCodec,
  BlockCodec,
  JC_J,
  GammaSJSONCodec,
  GammaKJSONCodec,
  ValidatorStatistcsJSONCodec,
  AuthorizerQueueJSONCodec,
  RecentHistoryJSONCodec,
  TicketIdentifierJSONCodec,
  DisputesJSONCodec,
  PrivilegedServicesJSONCodec,
  RHOJSONCodec,
  AccumulationQueueJSONCodec,
  AccumulationHistoryJSONCodec,
  JSONCodec,
  createJSONCodec,
  ArrayOfJSONCodec,
  GammaAJsonCodec,
  BufferJSONCodec,
  BigIntJSONCodec,
  IOTAJSONCodec,
  KappaJSONCodec,
  LambdaJSONCodec,
  NumberJSONCodec,
  MapJSONCodec,
  HashJSONCodec,
  Uint8ArrayJSONCodec,
  EntropyJSONCodec,
} from "@tsjam/codec";
import {
  CodeHash,
  Delta,
  Gas,
  Hash,
  JamState,
  SafroleState,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import {
  hextToBigInt,
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/utils";

type DunaState = {
  alpha: JC_J<ReturnType<typeof AuthorizerPoolJSONCodec>>;
  varphi: JC_J<ReturnType<typeof AuthorizerQueueJSONCodec>>;
  beta: JC_J<typeof RecentHistoryJSONCodec>;
  gamma: {
    gamma_k: JC_J<typeof GammaKJSONCodec>;
    gamma_z: string;
    gamma_s: JC_J<typeof GammaSJSONCodec>;
    gamma_a: JC_J<typeof TicketIdentifierJSONCodec>;
  };
  psi: JC_J<typeof DisputesJSONCodec>;
  eta: JC_J<typeof EntropyJSONCodec>;
  iota: JC_J<typeof ValidatorStatistcsJSONCodec>;
  kappa: JC_J<typeof ValidatorStatistcsJSONCodec>;
  lambda: JC_J<typeof ValidatorStatistcsJSONCodec>;
  rho: JC_J<typeof RHOJSONCodec>;
  tau: number;
  chi: JC_J<typeof PrivilegedServicesJSONCodec>;
  pi: JC_J<typeof ValidatorStatistcsJSONCodec>;
  theta: JC_J<typeof AccumulationQueueJSONCodec>;
  xi: JC_J<typeof AccumulationHistoryJSONCodec>;
  accounts: Array<{
    id: ServiceIndex;
    data: {
      service: {
        code_hash: string;
        balance: number;
        min_item_gas: number;
        min_memo_gas: number;
        bytes: number;
        items: number;
      };
      storage: Record<string, string>; // key, value
      preimages: Array<{ hash: string; blob: string }>;
      lookup_meta: Array<{
        key: { hash: string; length: number };
        value: number[];
      }>;
    };
  }>;
};

const preimageLCodec: JSONCodec<
  ServiceAccount["preimage_l"],
  DunaState["accounts"][0]["data"]["lookup_meta"]
> = {
  fromJSON(json) {
    const toRet: ServiceAccount["preimage_l"] = new Map();
    for (const [, value] of json.entries()) {
      const h = HashJSONCodec().fromJSON(value.key.hash);

      if (!toRet.has(h)) {
        toRet.set(h, new Map());
      }
      const hMap = toRet.get(h)!;
      hMap.set(
        value.key.length as Tagged<u32, "length">,
        value.value as UpToSeq<u32, 3, "Nt">,
      );
    }
    return toRet;
  },
  toJSON(value) {
    return [...value.entries()]
      .map(([k, v]) => {
        return [...v.entries()].map(([length, value]) => {
          return {
            key: {
              hash: HashJSONCodec().toJSON(k),
              length: NumberJSONCodec().toJSON(length),
            },
            value: value,
          };
        });
      })
      .flat();
  },
};
const accountsCodec: JSONCodec<Delta, DunaState["accounts"]> = MapJSONCodec(
  { key: "id", value: "data" },
  NumberJSONCodec<ServiceIndex>(),
  {
    fromJSON(json: DunaState["accounts"][0]["data"]) {
      const x: ServiceAccount = {
        codeHash: HashJSONCodec<CodeHash>().fromJSON(json.service.code_hash),
        balance: BigIntJSONCodec<u64>().fromJSON(json.service.balance),
        minGasAccumulate: BigIntJSONCodec<Gas>().fromJSON(
          json.service.min_item_gas,
        ),
        minGasOnTransfer: BigIntJSONCodec<Gas>().fromJSON(
          json.service.min_memo_gas,
        ),
        storage: new Map(
          Object.entries(json.storage).map(([k, v]) => {
            return [HashJSONCodec().fromJSON(k), BufferJSONCodec().fromJSON(v)];
          }),
        ),
        preimage_p: MapJSONCodec(
          { key: "hash", value: "blob" },
          HashJSONCodec<Hash>(),
          Uint8ArrayJSONCodec,
        ).fromJSON(json.preimages),
        preimage_l: preimageLCodec.fromJSON(json.lookup_meta),
      };
      return x;
    },
    toJSON(value) {
      const ret: DunaState["accounts"][0]["data"] = {
        service: {
          code_hash: HashJSONCodec().toJSON(value.codeHash),
          balance: BigIntJSONCodec().toJSON(value.balance),
          min_item_gas: BigIntJSONCodec().toJSON(value.minGasAccumulate),
          min_memo_gas: BigIntJSONCodec().toJSON(value.minGasOnTransfer),
          items: serviceAccountItemInStorage(value),
          bytes: Number(serviceAccountTotalOctets(value)),
        },
        storage: Object.fromEntries(value.storage.entries()),
        preimages: [...value.preimage_p.entries()].map(([k, v]) => {
          return {
            hash: HashJSONCodec().toJSON(k),
            blob: Uint8ArrayJSONCodec.toJSON(v),
          };
        }),
        lookup_meta: preimageLCodec.toJSON(value.preimage_l),
      };
      return ret;
    },
  },
);
const stateCodec: JSONCodec<JamState, DunaState> = createJSONCodec([
  ["authPool", "alpha", AuthorizerPoolJSONCodec()],
  ["authQueue", "varphi", AuthorizerQueueJSONCodec()],
  ["recentHistory", "beta", RecentHistoryJSONCodec],
  /*
  [
    "safroleState",
    "gamma",
    createJSONCodec<SafroleState, DunaState["gamma"]>([
      ["gamma_k", "gamma_k", GammaKJSONCodec],
      ["gamma_s", "gamma_s", GammaSJSONCodec],
      ["gamma_a", "gamma_a", GammaAJsonCodec],
      [
        "gamma_z",
        "gamma_z",
        {
          fromJSON(v) {
            return hextToBigInt<SafroleState["gamma_z"], 144>(v);
          },
          toJSON(v: SafroleState["gamma_z"]) {
            return `0x${v.toString(16).padStart(144, "0")}`;
          },
        },
      ],
    ]),
  ],
  ["disputes", "psi", DisputesJSONCodec],
  ["entropy", "eta", EntropyJSONCodec],
  ["iota", "iota", IOTAJSONCodec],
  ["kappa", "kappa", KappaJSONCodec],
  ["lambda", "lambda", LambdaJSONCodec],
  ["rho", "rho", RHOJSONCodec],
  ["tau", "tau", NumberJSONCodec<Tau>()],
  ["privServices", "chi", PrivilegedServicesJSONCodec],
  ["validatorStatistics", "pi", ValidatorStatistcsJSONCodec],
  ["accumulationQueue", "theta", AccumulationQueueJSONCodec],
  ["accumulationHistory", "xi", AccumulationHistoryJSONCodec],
  ["serviceAccounts", "accounts", accountsCodec],
  */
]);
describe("jamduna", () => {
  it("try ciao", () => {
    const kind = "tiny";

    const gen = BlockCodec.decode(
      fs.readFileSync(
        `${__dirname}/../../../jamtestnet/chainspecs/blocks/genesis-${kind}.bin`,
      ),
    );

    const state = JSON.parse(
      fs.readFileSync(
        `${__dirname}/../../../jamtestnet/chainspecs/state_snapshots/genesis-${kind}.json`,
        "utf8",
      ),
    );

    const tsJamState = stateCodec.fromJSON(state);
    console.log(tsJamState);

    // console.log(gen.value.header.blockAuthorKeyIndex);
    //console.log("ciao");
  });
  it("test ", () => {
    expect("ciao").toBe("ciao");
  });
});
