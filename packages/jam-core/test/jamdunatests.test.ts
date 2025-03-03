import { describe, it, vi, expect } from "vitest";
import fs from "fs";
import {
  AuthorizerPoolCodec,
  AuthorizerPoolJSONCodec,
  AuthorizerQueueCodec,
  BlockCodec,
  createCodec,
  JC_J,
  GammaSJSONCodec,
  ValidatorStatistcsJSONCodec,
} from "@tsjam/codec";
import {
  AuthorizerPool,
  AuthorizerQueue,
  Delta,
  IDisputesState,
  JamState,
  RecentHistory,
  RHO,
  SafroleState,
  ServiceAccount,
  ServiceIndex,
  SingleValidatorStatistics,
  Tau,
  ValidatorStatistics,
} from "@tsjam/types";

type DunaState = {
  alpha: AuthorizerPool;
  varphi: AuthorizerQueue;
  beta: RecentHistory;
  gamma: {
    gamma_k: SafroleState["gamma_k"];
    gamma_z: SafroleState["gamma_z"];
    gamma_s: JC_J<typeof GammaSJSONCodec>;
    gamma_a: SafroleState["gamma_a"];
  };
  psi: IDisputesState;
  eta: JamState["entropy"];
  iota: JamState["iota"];
  kappa: JamState["kappa"];
  lambda: JamState["lambda"];
  rho: RHO;
  tau: Tau;
  chi: {
    chi_m: ServiceIndex;
    chi_a: ServiceIndex;
    chi_v: ServiceIndex;
    chi_g: null | Record<ServiceIndex, number>;
  };
  pi: JC_J<typeof ValidatorStatistcsJSONCodec>;
  theta: [];
  xi: [];
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

const x: DunaState["gamma"];
x.gamma_s;

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
