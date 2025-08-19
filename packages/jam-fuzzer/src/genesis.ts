import { getConstantsMode } from "@tsjam/constants";
import {
  AccumulationHistoryImpl,
  AccumulationQueueImpl,
  AuthorizerPoolImpl,
  AuthorizerQueueImpl,
  BetaImpl,
  DeltaImpl,
  DisputesStateImpl,
  EpochMarkerValidatorImpl,
  GammaPImpl,
  HeaderEpochMarkerImpl,
  HeaderLookupHistoryImpl,
  HeaderOffenderMarkerImpl,
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamEntropyImpl,
  JamSignedHeaderImpl,
  JamStateImpl,
  JamStatisticsImpl,
  KappaImpl,
  LambdaImpl,
  LastAccOutsImpl,
  PrivilegedServicesImpl,
  RHOImpl,
  SafroleStateImpl,
  SlotImpl,
  TauImpl,
  ValidatorsImpl,
} from "@tsjam/core";
import { Blake2bHash, Tagged, u32, ValidatorIndex } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { VALIDATORS } from "./debugKeys";

export const GENESIS = new JamSignedHeaderImpl({
  parent: toTagged(new Uint8Array(32).fill(0)),
  parentStateRoot: toTagged(new Uint8Array(32).fill(0)),
  extrinsicHash: toTagged(new Uint8Array(32).fill(0)),
  slot: <TauImpl>new SlotImpl(<u32>0),
  epochMarker: new HeaderEpochMarkerImpl({
    entropy: <Blake2bHash>new Uint8Array(32).fill(0),
    entropy2: <Blake2bHash>new Uint8Array(32).fill(0),
    validators: toTagged(
      VALIDATORS.map((keys) => {
        return new EpochMarkerValidatorImpl({
          ed25519: keys.ed25519.public,
          bandersnatch: keys.bandersnatch.public,
        });
      }),
    ),
  }),
  offendersMark: new HeaderOffenderMarkerImpl([]),
  authorIndex: <ValidatorIndex>0,
  entropySource: toTagged(new Uint8Array(96).fill(0)),
  seal: toTagged(new Uint8Array(96).fill(0)),
});

export const GENESIS_STATE = new JamStateImpl({
  authPool: AuthorizerPoolImpl.newEmpty(),

  beta: BetaImpl.newEmpty(),

  safroleState: SafroleStateImpl.newEmpty(),

  lambda: <JamStateImpl["lambda"]>LambdaImpl.newEmpty(),

  kappa: <JamStateImpl["kappa"]>KappaImpl.newEmpty(),

  iota: <Tagged<ValidatorsImpl, "iota">>ValidatorsImpl.newEmpty(),

  serviceAccounts: DeltaImpl.newEmpty(),

  entropy: JamEntropyImpl.newEmpty(),

  authQueue: AuthorizerQueueImpl.newEmpty(),

  privServices: PrivilegedServicesImpl.newEmpty(),

  disputes: DisputesStateImpl.newEmpty(),

  statistics: JamStatisticsImpl.newEmpty(),

  accumulationQueue: AccumulationQueueImpl.newEmpty(),

  accumulationHistory: AccumulationHistoryImpl.newEmpty(),

  rho: RHOImpl.newEmpty(),

  slot: <TauImpl>new SlotImpl(<u32>0),

  mostRecentAccumulationOutputs: LastAccOutsImpl.newEmpty(),

  headerLookupHistory: HeaderLookupHistoryImpl.newEmpty(),

  block: new JamBlockImpl({
    header: GENESIS,
    extrinsics: JamBlockExtrinsicsImpl.newEmpty(),
  }),
});

// set the state according to the genesis header
GENESIS_STATE.safroleState.gamma_p = <Tagged<GammaPImpl, "gamma_p">>(
  GammaPImpl.fromEpochMarker(GENESIS.epochMarker!)
);

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { xBytesCodec } = await import("@tsjam/codec");
  describe("genesis", () => {
    it("genesis should have expected hash", () => {
      const hashes = {
        tiny: "0xe864d485113737c28c2fef3b2aed39cb2f289a369b15c54e9c44720bcfdc0ca0",
        full: "0x57f075e6bb0b8778b59261fa7ec32626464e4d2f444fca4312dfbf94f3584032",
      };
      expect(xBytesCodec(32).toJSON(GENESIS.signedHash())).eq(
        hashes[getConstantsMode()],
      );
    });
  });
}
