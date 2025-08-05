import { AccumulationHistoryImpl } from "@/classes/AccumulationHistoryImpl";
import {
  AccumulationQueueImpl,
  AccumulationQueueItem,
} from "@/classes/AccumulationQueueImpl";
import { AuthorizerPoolImpl } from "@/classes/AuthorizerPoolImpl";
import { AuthorizerQueueImpl } from "@/classes/AuthorizerQueueImpl";
import { BetaImpl } from "@/classes/BetaImpl";
import { CoreStatisticsImpl } from "@/classes/CoreStatisticsImpl";
import { DeltaImpl } from "@/classes/DeltaImpl";
import { DisputesStateImpl } from "@/classes/DisputesStateImpl";
import { HeaderLookupHistoryImpl } from "@/classes/HeaderLookupHistoryImpl";
import { JamEntropyImpl } from "@/classes/JamEntropyImpl";
import { JamStateImpl } from "@/classes/JamStateImpl";
import { JamStatisticsImpl } from "@/classes/JamStatisticsImpl";
import { LastAccOutsImpl, SingleAccOutImpl } from "@/classes/LastAccOutsImpl";
import { PrivilegedServicesImpl } from "@/classes/PrivilegedServicesImpl";
import { RecentHistoryImpl } from "@/classes/RecentHistoryImpl";
import { RecentHistoryItemImpl } from "@/classes/RecentHistoryItemImpl";
import { RHOImpl } from "@/classes/RHOImpl";
import { SafroleStateImpl } from "@/classes/SafroleStateImpl";
import { ServicesStatisticsImpl } from "@/classes/ServicesStatisticsImpl";
import { ValidatorDataImpl } from "@/classes/ValidatorDataImpl";
import { ValidatorsImpl } from "@/classes/ValidatorsImpl";
import { ValidatorStatisticsImpl } from "@/classes/ValidatorStatisticsImpl";
import {
  AUTHPOOL_SIZE,
  AUTHQUEUE_MAX_SIZE,
  CORES,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
  RECENT_HISTORY_LENGTH,
} from "@tsjam/constants";
import {
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  Hash,
  ServiceIndex,
  Tau,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const dummyValidator = (): ValidatorDataImpl => {
  return new ValidatorDataImpl({
    banderSnatch: Buffer.alloc(32).fill(0) as Uint8Array as BandersnatchKey,
    ed25519: {
      buf: Buffer.alloc(32).fill(0) as Uint8Array as ED25519PublicKey["buf"],
      bigint: toTagged(0n) as ED25519PublicKey["bigint"],
    },
    blsKey: new Uint8Array(144).fill(0) as BLSKey,
    metadata: new Uint8Array(128).fill(0) as ByteArrayOfLength<128>,
  });
};
export const dummyValidators = <T extends ValidatorsImpl>(): T => {
  return new ValidatorsImpl({
    elements: toTagged(
      new Array<ValidatorDataImpl>(NUMBER_OF_VALIDATORS).fill(dummyValidator()),
    ),
  }) as T;
};
export const dummySafroleState = (): SafroleStateImpl => {
  return new SafroleStateImpl();
};
export const dummyAuthPool = (): AuthorizerPoolImpl => {
  return new AuthorizerPoolImpl({
    elements: toTagged(
      new Array(CORES).fill(new Array(AUTHPOOL_SIZE).fill(toTagged(0n))),
    ),
  });
};
export const dummyBeta = (): BetaImpl => {
  return new BetaImpl({
    recentHistory: new RecentHistoryImpl({
      elements: toTagged(
        new Array(RECENT_HISTORY_LENGTH).fill(null).map(
          () =>
            new RecentHistoryItemImpl({
              stateRoot: toTagged(0n),
              reportedPackages: new Map(),
              headerHash: toTagged(0n),
              accumulationResultMMB: toTagged(0n),
            }),
        ),
      ),
    }),
    beefyBelt: new Array<Hash | undefined>(),
  });
};
export const dummyAuthQueue = (): AuthorizerQueueImpl => {
  return new AuthorizerQueueImpl({
    elements: toTagged(
      new Array(CORES)
        .fill(toTagged(0n))
        .map(() =>
          toTagged(
            new Array(AUTHQUEUE_MAX_SIZE).fill(null).map(() => toTagged(0n)),
          ),
        ),
    ),
  });
};

export const dummyDisputesState = (): DisputesStateImpl => {
  return new DisputesStateImpl({
    bad: new Set(),
    good: new Set(),
    wonky: new Set(),
    offenders: new Set(),
  });
};

export const dummyEntropy = <T extends JamEntropyImpl>(): T => {
  return <T>new JamEntropyImpl({
    _0: toTagged(0n),
    _1: toTagged(0n),
    _2: toTagged(0n),
    _3: toTagged(0n),
  });
};

export const dummyState = (): JamStateImpl => {
  return new JamStateImpl({
    beta: dummyBeta(),
    authPool: dummyAuthPool(),
    safroleState: dummySafroleState(),
    lambda: dummyValidators(),
    kappa: dummyValidators(),
    iota: dummyValidators(),
    serviceAccounts: new DeltaImpl(new Map()),
    entropy: dummyEntropy(),
    authQueue: dummyAuthQueue(),
    privServices: new PrivilegedServicesImpl({
      manager: <ServiceIndex>0,
      delegator: <ServiceIndex>0,
      registrar: <ServiceIndex>0,
      assigners: toTagged(new Array<ServiceIndex>(CORES).fill(<ServiceIndex>0)),
      alwaysAccers: new Map(),
    }),
    disputes: dummyDisputesState(),
    statistics: new JamStatisticsImpl({
      validators: new ValidatorStatisticsImpl(),
      cores: new CoreStatisticsImpl(),
      services: new ServicesStatisticsImpl(),
    }),
    accumulationQueue: new AccumulationQueueImpl({
      elements: toTagged(new Array<Array<AccumulationQueueItem>>(EPOCH_LENGTH)),
    }),
    accumulationHistory: new AccumulationHistoryImpl({
      elements: toTagged(
        new Array(EPOCH_LENGTH)
          .fill(null)
          .map(() => new Set<WorkPackageHash>()),
      ),
    }),
    rho: new RHOImpl({ elements: toTagged(new Array(CORES).fill(undefined)) }),
    tau: toTagged(0) as Tau,
    mostRecentAccumulationOutputs: new LastAccOutsImpl(
      new Array<SingleAccOutImpl>(),
    ),
    headerLookupHistory: new HeaderLookupHistoryImpl(),
  });
};
