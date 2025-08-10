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
import { GammaAImpl } from "@/classes/GammaAImpl";
import { GammaPImpl } from "@/classes/GammaPImpl";
import { GammaSImpl } from "@/classes/GammaSImpl";
import { GammaZImpl } from "@/classes/GammaZImpl";
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
import { SingleCoreStatisticsImpl } from "@/classes/SingleCoreStatisticsImpl";
import { SingleValidatorStatisticsImpl } from "@/classes/SingleValidatorStatisticsImpl";
import { SlotImpl, TauImpl } from "@/classes/SlotImpl";
import { ValidatorDataImpl } from "@/classes/ValidatorDataImpl";
import { ValidatorsImpl } from "@/classes/ValidatorsImpl";
import { ValidatorStatisticsCollectionImpl } from "@/classes/ValidatorStatisticsCollectionImpl";
import { ValidatorStatisticsImpl } from "@/classes/ValidatorStatisticsImpl";
import { IdentityMap } from "@/data_structures/identityMap";
import { IdentitySet } from "@/data_structures/identitySet";
import {
  AUTHPOOL_SIZE,
  AUTHQUEUE_MAX_SIZE,
  CORES,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
  RECENT_HISTORY_LENGTH,
} from "@tsjam/constants";
import {
  AuthorizerHash,
  BandersnatchKey,
  BandersnatchRingRoot,
  Blake2bHash,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  Gas,
  Hash,
  HeaderHash,
  ServiceIndex,
  StateRootHash,
  u16,
  u32,
  WorkPackageHash,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const dummyValidator = (): ValidatorDataImpl => {
  return new ValidatorDataImpl({
    banderSnatch: Buffer.alloc(32).fill(0) as Uint8Array as BandersnatchKey,
    ed25519: Buffer.alloc(32).fill(0) as Uint8Array as ED25519PublicKey,
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
  return new SafroleStateImpl({
    gamma_a: new GammaAImpl({ elements: toTagged([]) }),
    gamma_p: toTagged(new GammaPImpl({ elements: dummyValidators().elements })),
    gamma_s: new GammaSImpl({
      keys: toTagged(
        new Array(EPOCH_LENGTH).fill(
          new Uint8Array(32).fill(0) as BandersnatchKey,
        ),
      ),
    }),
    gamma_z: new GammaZImpl({
      root: new Uint8Array(144).fill(0) as BandersnatchRingRoot,
    }),
  });
};
export const dummyAuthPool = (): AuthorizerPoolImpl => {
  return new AuthorizerPoolImpl({
    elements: toTagged(
      new Array(CORES).fill(
        new Array(AUTHPOOL_SIZE).fill(toTagged(new Uint8Array(32).fill(0))),
      ),
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
              stateRoot: <StateRootHash>new Uint8Array(32).fill(0),
              reportedPackages: new IdentityMap(),
              headerHash: <HeaderHash>new Uint8Array(32).fill(0),
              accumulationResultMMB: <Hash>new Uint8Array(32).fill(0),
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
        .fill(0)
        .map(() =>
          toTagged(
            new Array(AUTHQUEUE_MAX_SIZE)
              .fill(null)
              .map(() => <AuthorizerHash>new Uint8Array(32).fill(0)),
          ),
        ),
    ),
  });
};

export const dummyDisputesState = (): DisputesStateImpl => {
  return new DisputesStateImpl({
    bad: new IdentitySet(),
    good: new IdentitySet(),
    wonky: new IdentitySet(),
    offenders: new IdentitySet(),
  });
};

export const dummyEntropy = <T extends JamEntropyImpl>(): T => {
  return <T>new JamEntropyImpl({
    _0: <Blake2bHash>(<Hash>new Uint8Array(32).fill(0)),
    _1: <Blake2bHash>(<Hash>new Uint8Array(32).fill(0)),
    _2: <Blake2bHash>(<Hash>new Uint8Array(32).fill(0)),
    _3: <Blake2bHash>(<Hash>new Uint8Array(32).fill(0)),
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
      validators: new ValidatorStatisticsImpl({
        accumulator: new ValidatorStatisticsCollectionImpl({
          elements: toTagged(
            new Array(NUMBER_OF_VALIDATORS).fill(
              new SingleValidatorStatisticsImpl({
                assurances: <u32>0,
                blocks: <u32>0,
                guarantees: <u32>0,
                preimageCount: <u32>0,
                preimageSize: <u32>0,
                tickets: <u32>0,
              }),
            ),
          ),
        }),
        previous: new ValidatorStatisticsCollectionImpl({
          elements: toTagged(
            new Array(NUMBER_OF_VALIDATORS).fill(
              new SingleValidatorStatisticsImpl({
                assurances: <u32>0,
                blocks: <u32>0,
                guarantees: <u32>0,
                preimageCount: <u32>0,
                preimageSize: <u32>0,
                tickets: <u32>0,
              }),
            ),
          ),
        }),
      }),
      cores: new CoreStatisticsImpl({
        elements: toTagged(
          new Array(CORES).fill(null).map(
            () =>
              new SingleCoreStatisticsImpl({
                daLoad: <u32>0,
                bundleSize: <u32>0,
                exportCount: <u16>0,
                extrinsicCount: <u16>0,
                extrinsicSize: <u32>0,
                gasUsed: <Gas>0n,
                importCount: <u16>0,
                popularity: <u16>0,
              }),
          ),
        ),
      }),
      services: new ServicesStatisticsImpl({
        elements: new Map(),
      }),
    }),
    accumulationQueue: new AccumulationQueueImpl({
      elements: toTagged(
        new Array<Array<AccumulationQueueItem>>(EPOCH_LENGTH).fill([]),
      ),
    }),
    accumulationHistory: new AccumulationHistoryImpl({
      elements: toTagged(
        new Array(EPOCH_LENGTH)
          .fill(null)
          .map(() => new IdentitySet<WorkPackageHash>()),
      ),
    }),
    rho: new RHOImpl({ elements: toTagged(new Array(CORES).fill(undefined)) }),
    slot: <TauImpl>new SlotImpl(<u32>0),
    mostRecentAccumulationOutputs: new LastAccOutsImpl(
      new Array<SingleAccOutImpl>(),
    ),
    headerLookupHistory: new HeaderLookupHistoryImpl(),
  });
};
