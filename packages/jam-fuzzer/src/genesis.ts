import { getConstantsMode, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  AccumulationQueueImpl,
  AuthorizerPoolImpl,
  AuthorizerQueueImpl,
  BetaImpl,
  DeltaImpl,
  EpochMarkerValidatorImpl,
  HeaderEpochMarkerImpl,
  HeaderOffenderMarkerImpl,
  JamSignedHeaderImpl,
  JamStateImpl,
  KappaImpl,
  LambdaImpl,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { Blake2bHash, u32, ValidatorIndex } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { generateDebugKeys } from "./debugKeys";

export const GENESIS = new JamSignedHeaderImpl({
  parent: toTagged(new Uint8Array(32).fill(0)),
  parentStateRoot: toTagged(new Uint8Array(32).fill(0)),
  extrinsicHash: toTagged(new Uint8Array(32).fill(0)),
  slot: <TauImpl>new SlotImpl(<u32>0),
  epochMarker: new HeaderEpochMarkerImpl({
    entropy: <Blake2bHash>new Uint8Array(32).fill(0),
    entropy2: <Blake2bHash>new Uint8Array(32).fill(0),
    validators: toTagged(
      new Array(NUMBER_OF_VALIDATORS).fill(0).map((_, index) => {
        const keys = generateDebugKeys(index);
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
  authPool: AuthorizerPoolImpl.create(),
  beta: BetaImpl.create(),
  /**
   * `γ`
   */
  safroleState: SafroleState;

  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda: LambdaImpl.create(),

  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa: KappaImpl.create(),

  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota: Tagged<Validators, "iota">;

  /**
   * `δ`
   */
  serviceAccounts: DeltaImpl.create();

  /**
   * `η`
   */
  entropy: JamEntropy;

  /**
   * `φ`
   */
  authQueue: AuthorizerQueueImpl.create();

  /**
   * `χ`
   */
  privServices: PrivilegedServices;

  /**
   * `ψ`
   */
  disputes: IDisputesState;

  /**
   * `π`
   */
  statistics: JamStatistics;

  /**
   * `θ`
   */
  accumulationQueue: AccumulationQueueImpl.create();

  /**
   * `ξ`
   */
  accumulationHistory: AccumulationHistory;

  /**
   * `ρ`
   */
  rho: RHO;

  /**
   * `τ` - the most recent block timeslot
   */
  slot: Slot;

  /**
   * `θ` - `\lastaccout`
   */
  mostRecentAccumulationOutputs: LastAccOuts;

  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory: HeaderLookupHistory;

  

})

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
