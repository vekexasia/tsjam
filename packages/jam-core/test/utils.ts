import {
  AuthorizerPool,
  AuthorizerQueue,
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  Gas,
  Hash,
  JamState,
  JamStatistics,
  RecentHistory,
  RecentHistoryItem,
  SafroleState,
  ServiceIndex,
  Tau,
  u16,
  u32,
  ValidatorData,
  ValidatorStatistics,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const dummyValidator = (): ValidatorData => {
  return {
    banderSnatch: Buffer.alloc(32).fill(0) as Uint8Array as BandersnatchKey,
    ed25519: {
      buf: Buffer.alloc(32).fill(0) as Uint8Array as ED25519PublicKey["buf"],
      bigint: toTagged(0n),
    },
    blsKey: new Uint8Array(144).fill(0) as BLSKey,
    metadata: new Uint8Array(128).fill(0) as ByteArrayOfLength<128>,
  } as unknown as ValidatorData;
};
export const dummyState = (conf: {
  validators: number;
  cores: number;
  epoch: number;
}): JamState => {
  const { validators, cores, epoch } = conf;
  return {
    safroleState: {
      gamma_a: new Array(validators)
        .fill(null)
        .map(dummyValidator) as unknown as SafroleState["gamma_a"],
      gamma_k: new Array(validators)
        .fill(null)
        .map(dummyValidator) as unknown as SafroleState["gamma_k"],
      gamma_s: new Array(validators)
        .fill(null)
        .map(dummyValidator) as unknown as SafroleState["gamma_s"],
      gamma_z: new Uint8Array(144) as unknown as SafroleState["gamma_z"],
    },
    tau: 0 as Tau,
    entropy: [0n, 0n, 0n, 0n].map(toTagged) as JamState["entropy"],
    iota: new Array(validators)
      .fill(null)
      .map(dummyValidator) as unknown as JamState["iota"],

    kappa: new Array(validators)
      .fill(null)
      .map(dummyValidator) as unknown as JamState["kappa"],
    lambda: new Array(validators)
      .fill(null)
      .map(dummyValidator) as unknown as JamState["lambda"],
    disputes: {
      psi_b: new Set(),
      psi_g: new Set(),
      psi_o: new Set(),
      psi_w: new Set(),
    },
    rho: new Array(cores).fill(undefined) as unknown as JamState["rho"],
    serviceAccounts: new Map(),
    accumulationHistory: new Array(epoch)
      .fill(undefined)
      .map(() => new Set()) as unknown as JamState["accumulationHistory"],
    accumulationQueue: new Array(epoch)
      .fill(undefined)
      .map(() => []) as unknown as JamState["accumulationQueue"],
    privServices: {
      assign: 0 as ServiceIndex,
      alwaysAccumulate: new Map(),
      manager: 0 as ServiceIndex,
      designate: 0 as ServiceIndex,
    },
    recentHistory: new Array(80).fill(null).map(
      () =>
        ({
          stateRoot: toTagged(0n),
          headerHash: toTagged(0n),
          reportedPackages: new Map(),
          accumulationResultMMR: [],
        }) as RecentHistoryItem,
    ) as RecentHistory,
    statistics: {
      validators: [null, null].map(() =>
        new Array(validators).fill({
          blocksProduced: 0,
          ticketsIntroduced: 0,
          preimagesIntroduced: 0,
          totalOctetsIntroduced: 0,
          guaranteedReports: 0,
          availabilityAssurances: 0,
        }),
      ) as ValidatorStatistics,
      cores: <JamStatistics["cores"]>new Array(cores).fill({
        daLoad: <u32>0,
        popularity: <u16>0,
        imports: <u16>0,
        extrinsicCount: <u16>0,
        extrinsicSize: <u32>0,
        exports: <u16>0,
        bundleSize: <u32>0,
        usedGas: <Gas>0n,
      }),
      services: new Map(),
    },
    authPool: new Array(cores).fill([]) as unknown as AuthorizerPool,
    authQueue: new Array(cores).fill(
      new Array(80).fill(0n as Hash),
    ) as AuthorizerQueue,
    headerLookupHistory: new Map(),
  };
};
