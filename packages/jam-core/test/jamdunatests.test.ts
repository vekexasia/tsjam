import { describe, it } from "vitest";
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
} from "@tsjam/codec";
import { JamState, SafroleState, ServiceIndex, Tau } from "@tsjam/types";
import { hexToBytes, hextToBigInt } from "@tsjam/utils";

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
  eta: JamState["entropy"];
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
  //["eta", "psi", DisputesJSONCodec],
  ["iota", "iota", IOTAJSONCodec],
  ["kappa", "kappa", KappaJSONCodec],
  ["lambda", "lambda", LambdaJSONCodec],
  ["rho", "rho", RHOJSONCodec],
  ["tau", "tau", NumberJSONCodec<Tau>()],
  ["privServices", "chi", PrivilegedServicesJSONCodec],
  ["validatorStatistics", "pi", ValidatorStatistcsJSONCodec],
  ["accumulationQueue", "theta", AccumulationQueueJSONCodec],
  ["accumulationHistory", "xi", AccumulationHistoryJSONCodec],
]);
describe("jamduna", () => {
  it("try", () => {
    const kind = "tiny";

    const gen = BlockCodec.decode(
      fs.readFileSync(
        `${__dirname}/../../../jamtestnet/chainspecs/blocks/genesis-${kind}.bin`,
      ),
    );

    const state = fs.readFileSync(
      `${__dirname}/../../../jamtestnet/chainspecs/state_snapshots/genesis-${kind}.json`,
      "utf8",
    );

    console.log(state);

    // console.log(gen.value.header.blockAuthorKeyIndex);
    //console.log("ciao");
  });
});
