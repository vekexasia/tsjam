import { AccumulationHistoryImpl } from "@/impls/accumulation-history-impl";
import {
  AccumulationQueueImpl,
  AccumulationQueueItem,
} from "@/impls/accumulation-queue-impl";
import { AuthorizerPoolImpl } from "@/impls/authorizer-pool-impl";
import { AuthorizerQueueImpl } from "@/impls/authorizer-queue-impl";
import { BetaImpl } from "@/impls/beta-impl";
import { CoreStatisticsImpl } from "@/impls/core-statistics-impl";
import { DeltaImpl } from "@/impls/delta-impl";
import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import { GammaAImpl } from "@/impls/gamma-a-impl";
import { GammaPImpl } from "@/impls/gamma-p-impl";
import { GammaSImpl } from "@/impls/gamma-s-impl";
import { GammaZImpl } from "@/impls/gamma-z-impl";
import { HeaderLookupHistoryImpl } from "@/impls/header-lookup-history-impl";
import { JamEntropyImpl } from "@/impls/jam-entropy-impl";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { JamStatisticsImpl } from "@/impls/jam-statistics-impl";
import { LastAccOutsImpl, SingleAccOutImpl } from "@/impls/last-acc-outs-impl";
import { PrivilegedServicesImpl } from "@/impls/privileged-services-impl";
import { RecentHistoryImpl } from "@/impls/recent-history-impl";
import { RecentHistoryItemImpl } from "@/impls/recent-history-item-impl";
import { RHOImpl } from "@/impls/rho-impl";
import { SafroleStateImpl } from "@/impls/safrole-state-impl";
import { ServicesStatisticsImpl } from "@/impls/services-statistics-impl";
import { SingleCoreStatisticsImpl } from "@/impls/single-core-statistics-impl";
import { SingleValidatorStatisticsImpl } from "@/impls/single-validator-statistics-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import { ValidatorDataImpl } from "@/impls/validator-data-impl";
import { ValidatorsImpl } from "@/impls/validators-impl";
import { ValidatorStatisticsCollectionImpl } from "@/impls/validator-statistics-collection-impl";
import { ValidatorStatisticsImpl } from "@/impls/validator-statistics-impl";
import { IdentityMap } from "@/data-structures/identity-map";
import { IdentitySet } from "@/data-structures/identity-set";
import { SafeMap } from "@/data-structures/safe-map";
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
    headerLookupHistory: new HeaderLookupHistoryImpl(new SafeMap()),
  });
};
