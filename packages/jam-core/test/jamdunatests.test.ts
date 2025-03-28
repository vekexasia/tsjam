import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import {
  AuthorizerPoolJSONCodec,
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
  BlockJSONCodec,
  encodeWithCodec,
  HashCodec,
  E_4_int,
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
import { hextToBigInt } from "@tsjam/utils";
import { importBlock } from "@/importBlock";
import { merkelizeState, merkleStateMap, stateKey } from "@tsjam/merklization";
import assert from "assert";
import {
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/serviceaccounts";

const mocks = vi.hoisted(() => {
  return {
    CORES: 341,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
    VALIDATOR_CORE_ROTATION: 10,
    MAX_TICKETS_PER_VALIDATOR: 2,
    LOTTERY_MAX_SLOT: 500,
    PREIMAGE_EXPIRATION: 28800,
  };
});
vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };

  Object.defineProperty(toRet, "PREIMAGE_EXPIRATION", {
    get() {
      return mocks.PREIMAGE_EXPIRATION;
    },
  });
  Object.defineProperty(toRet, "VALIDATOR_CORE_ROTATION", {
    get() {
      return mocks.VALIDATOR_CORE_ROTATION;
    },
  });
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return mocks.NUMBER_OF_VALIDATORS;
    },
  });
  Object.defineProperty(toRet, "EPOCH_LENGTH", {
    get() {
      return mocks.EPOCH_LENGTH;
    },
  });
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  Object.defineProperty(toRet, "LOTTERY_MAX_SLOT", {
    get() {
      return mocks.LOTTERY_MAX_SLOT;
    },
  });
  Object.defineProperty(toRet, "MAX_TICKETS_PER_VALIDATOR", {
    get() {
      return mocks.MAX_TICKETS_PER_VALIDATOR;
    },
  });

  return toRet;
});

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
      storage: null | Record<string, string>; // key, value
      preimages: null | Array<{ hash: string; blob: string }>;
      lookup_meta: Array<{
        key: { hash: string; length: number };
        value: null | number[];
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
            value: value.length === 0 ? null : value,
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
          Object.entries(json.storage || {}).map(([k, v]) => {
            return [HashJSONCodec().fromJSON(k), BufferJSONCodec().fromJSON(v)];
          }),
        ),
        preimage_p: MapJSONCodec(
          { key: "hash", value: "blob" },
          HashJSONCodec<Hash>(),
          Uint8ArrayJSONCodec,
        ).fromJSON(json.preimages || []),
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
        storage: (() => {
          if (value.storage.size === 0) {
            return null;
          }
          return <Record<string, string>>Object.fromEntries(
            [...value.storage.entries()].map(([k, v]) => {
              return [HashJSONCodec().toJSON(k), Uint8ArrayJSONCodec.toJSON(v)];
            }),
          );
        })(),
        preimages: (() => {
          if (value.preimage_p.size === 0) {
            return null;
          }
          return [...value.preimage_p.entries()].map(([k, v]) => {
            return {
              hash: HashJSONCodec().toJSON(k),
              blob: Uint8ArrayJSONCodec.toJSON(v),
            };
          });
        })(),
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
  // FIXME:when duna fixes it
  //["validatorStatistics", "pi", ValidatorStatistcsJSONCodec],
  ["accumulationQueue", "theta", AccumulationQueueJSONCodec],
  ["accumulationHistory", "xi", AccumulationHistoryJSONCodec],
  ["serviceAccounts", "accounts", accountsCodec],
]);
function checkMerkle(jamState: JamState, duna: any) {
  const tsjamState = merkleStateMap(jamState);

  for (const items of duna.keyvals.slice(0)) {
    const [key, value, desc] = items;
    const k = HashJSONCodec().fromJSON(key);
    assert(tsjamState.has(k), `missing key ${key}|${desc}`);

    expect(
      Uint8ArrayJSONCodec.toJSON(tsjamState.get(k)!),
      `${key}|${desc}`,
    ).toBe(value);
  }
  // check merkle root
  const mtr = merkelizeState(jamState);
  expect(HashJSONCodec().toJSON(mtr)).eq(duna.state_root);
  //  console.log(
  //    [...tsjamState.keys()].map(
  //      (x) => `${HashJSONCodec().toJSON(x)}`, // => ${Uint8ArrayJSONCodec.toJSON(tsjamState.get(x)!)}`,
  //    ),
  //  );
}
describe("jamduna", () => {
  beforeEach(() => {
    mocks.CORES = 2;
    mocks.NUMBER_OF_VALIDATORS = 6;
    mocks.EPOCH_LENGTH = 12;
    mocks.MAX_TICKETS_PER_VALIDATOR = 3;
    mocks.LOTTERY_MAX_SLOT = 10;
    mocks.VALIDATOR_CORE_ROTATION = 4;
    mocks.PREIMAGE_EXPIRATION = 6;
  });
  it("fallback", () => {
    const kind = "tiny";
    const set = "assurances";

    let tsJamState = stateCodec.fromJSON(
      JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../../jamtestnet/chainspecs/state_snapshots/genesis-${kind}.json`,
          "utf8",
        ),
      ),
    );
    tsJamState.headerLookupHistory = new Map();

    const genesis = BlockJSONCodec.fromJSON(
      JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../../jamtestnet/chainspecs/blocks/genesis-${kind}.json`,
          "utf8",
        ),
      ),
    );

    const dir = fs
      .readdirSync(
        `${__dirname}/../../../jamtestnet/data/${set}/state_transitions/`,
      )
      .filter((x) => x.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => f.replace(".json", ""));
    let curBlock = genesis;

    for (const block of dir) {
      console.log("Processing block", block);
      const dunaStateTransition = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../../jamtestnet/data/${set}/state_transitions/${block}.json`,
          "utf8",
        ),
      );

      checkMerkle(tsJamState, dunaStateTransition.pre_state);
      const newBlock = BlockJSONCodec.fromJSON(dunaStateTransition.block);
      const [error, tsJamNewState] = importBlock(newBlock, {
        block: curBlock,
        state: tsJamState,
      }).safeRet();
      expect(error).toBeUndefined();

      checkMerkle(tsJamNewState!.state, dunaStateTransition.post_state);

      // check against state snapshott
      const dunaState = JSON.parse(
        fs.readFileSync(
          `${__dirname}/../../../jamtestnet/data/${set}/state_snapshots/${block}.json`,
          "utf8",
        ),
      );

      const encodedJamState = stateCodec.toJSON(tsJamNewState!.state);
      for (const k in dunaState) {
        if (k !== "accounts") {
          // @ts-ignore
          expect(encodedJamState[k], `${k} - ${block}`).deep.eq(dunaState[k]);
        }
      }

      // check accounts which is ok except for the damn storage
      // first sort them by id
      encodedJamState.accounts.sort((a, b) => a.id - b.id);
      dunaState.accounts.sort((a: any, b: any) => a.id - b.id);
      for (let i = 0; i < encodedJamState.accounts.length; i++) {
        const acc = encodedJamState.accounts[i];
        const dunaAcc = dunaState.accounts[i];

        expect(acc.id, `acc[${i}].id - block:${block}`).deep.eq(dunaAcc.id);
        expect(
          acc.data.service,
          `acc[${i}].data.service - block:${block}`,
        ).deep.eq(dunaAcc.data.service);
        acc.data.preimages?.sort((a, b) => a.hash.localeCompare(b.hash));
        dunaAcc.data.preimages?.sort((a: any, b: any) =>
          a.hash.localeCompare(b.hash),
        );
        expect(
          acc.data.preimages,
          `acc[${i}].data.preimages - block:${block}`,
        ).deep.eq(dunaAcc.data.preimages);
        //reorder lookup meta
        acc.data.lookup_meta.sort((a, b) =>
          a.key.hash.localeCompare(b.key.hash),
        );
        dunaAcc.data.lookup_meta.sort((a: any, b: any) =>
          a.key.hash.localeCompare(b.key.hash),
        );
        expect(
          acc.data.lookup_meta,
          `acc[${i}].data.lookup_meta - block:${block}`,
        ).deep.eq(dunaAcc.data.lookup_meta);

        // storage is broken in duna... lets use the merklization keys instead of real keys
        for (const realKey in acc.data.storage) {
          const k = encodeWithCodec(
            HashCodec,
            HashJSONCodec().fromJSON(realKey),
          );
          const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 1));

          const dunaKey = stateKey(
            acc.id,
            new Uint8Array([...pref, ...k.subarray(0, 28)]),
          );
          const dunaJSONKey = HashJSONCodec().toJSON(dunaKey);
          expect(
            acc.data.storage[realKey],
            `acc[${i}].data.storage[${realKey} - ${dunaJSONKey}] - block:${block}`,
          ).deep.eq(dunaAcc.data.storage[dunaJSONKey]);
        }
      }
      tsJamState = tsJamNewState!.state;
      curBlock = tsJamNewState!.block;
    }
  });
});
