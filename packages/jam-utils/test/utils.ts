import {
  AuthorizerPool,
  AuthorizerQueue,
  BandersnatchKey,
  Beta,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  GammaSFallback,
  Gas,
  Hash,
  JamState,
  JamStatistics,
  PrivilegedServices,
  RecentHistory,
  RecentHistoryItem,
  SafroleState,
  ServiceIndex,
  SingleValidatorStatistics,
  Tau,
  Ticket,
  u16,
  u32,
  ValidatorData,
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
      gamma_a: { elements: [] as Ticket[] } as SafroleState["gamma_a"],
      gamma_p: {
        elements: new Array(validators).fill(null).map(dummyValidator),
      } as SafroleState["gamma_p"],
      gamma_s: {
        keys: new Array(epoch)
          .fill(null)
          .map(() => dummyValidator().banderSnatch) as GammaSFallback,
      },
      gamma_z: new Uint8Array(144) as unknown as SafroleState["gamma_z"],
    },
    tau: 0 as Tau,
    entropy: { _0: 0n, _1: 0n, _2: 0n, _3: 0n } as JamState["entropy"],
    iota: {
      elements: new Array(validators).fill(null).map(dummyValidator),
    } as unknown as JamState["iota"],

    kappa: {
      elements: new Array(validators).fill(null).map(dummyValidator),
    } as unknown as JamState["kappa"],
    lambda: {
      elements: new Array(validators).fill(null).map(dummyValidator),
    } as unknown as JamState["lambda"],
    disputes: {
      good: new Set(),
      bad: new Set(),
      offenders: new Set(),
      wonky: new Set(),
    },
    rho: {
      elements: new Array(cores).fill(undefined),
    } as unknown as JamState["rho"],
    serviceAccounts: { elements: new Map() },
    accumulationHistory: {
      elements: new Array(epoch).fill(undefined).map(() => new Set()),
    } as unknown as JamState["accumulationHistory"],
    accumulationQueue: {
      elements: new Array(epoch).fill(undefined).map(() => []),
    } as unknown as JamState["accumulationQueue"],
    privServices: {
      assigners: new Array(cores).fill(0) as PrivilegedServices["assigners"],
      alwaysAccers: new Map(),
      manager: 0 as ServiceIndex,
      delegator: 0 as ServiceIndex,
    },
    beta: {
      recentHistory: {
        elements: new Array(80).fill(null).map(
          () =>
            ({
              stateRoot: toTagged(0n),
              headerHash: toTagged(0n),
              reportedPackages: new Map(),
              accumulationResultMMB: toTagged(0n),
            }) as RecentHistoryItem,
        ),
      } as RecentHistory,
      beefyBelt: [] as Beta["beefyBelt"],
    },
    statistics: {
      validators: {
        accumulator: new Array(validators).fill({
          blocks: 0,
          tickets: 0,
          preimageCount: 0,
          preimageSize: 0,
          guarantees: 0,
          assurances: 0,
        }) as any as SingleValidatorStatistics,
        previous: new Array(validators).fill({
          blocks: 0,
          tickets: 0,
          preimageCount: 0,
          preimageSize: 0,
          guarantees: 0,
          assurances: 0,
        }) as any as SingleValidatorStatistics,
      },
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
    authPool: {
      elements: new Array(cores).fill([]),
    } as unknown as AuthorizerPool,
    authQueue: {
      elements: new Array(cores).fill(new Array(80).fill(0n as Hash)),
    } as AuthorizerQueue,
    headerLookupHistory: { elements: new Map() },
    mostRecentAccumulationOutputs: { elements: [] },
  };
};
