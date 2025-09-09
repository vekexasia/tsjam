import { accumulateReports } from "@/accumulate";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import {
  JamState,
  Posterior,
  ServiceIndex,
  StateRootHash,
  Tagged,
  u32,
  u64,
} from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { AccumulationHistoryImpl } from "./accumulation-history-impl";
import { AccumulationQueueImpl } from "./accumulation-queue-impl";
import { AuthorizerPoolImpl } from "./authorizer-pool-impl";
import { AuthorizerQueueImpl } from "./authorizer-queue-impl";
import { BetaImpl } from "./beta-impl";
import { DeltaImpl } from "./delta-impl";
import {
  DisputesStateImpl,
  DisputesToPosteriorError,
} from "./disputes-state-impl";
import { EAValidationError } from "./extrinsics/assurances";
import { EGError } from "./extrinsics/guarantees";
import { EPError } from "./extrinsics/preimages";
import { ETError } from "./extrinsics/tickets";
import { GammaAError } from "./gamma-a-impl";
import { HeaderLookupHistoryImpl } from "./header-lookup-history-impl";
import { JamBlockImpl } from "./jam-block-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { JamStatisticsImpl } from "./jam-statistics-impl";
import { KappaImpl } from "./kappa-impl";
import { LambdaImpl } from "./lambda-impl";
import { LastAccOutsImpl } from "./last-acc-outs-impl";
import { PrivilegedServicesImpl } from "./privileged-services-impl";
import { RHOImpl } from "./rho-impl";
import { SafroleStateImpl } from "./safrole-state-impl";
import { SlotImpl, type TauError, type TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";
import { DisputesVerdictError } from "./extrinsics/disputes/verdicts";
import { DisputesCulpritError } from "./extrinsics/disputes/culprits";
import { DisputesFaultError } from "./extrinsics/disputes/faults";
import { HeaderValidationError } from "./jam-signed-header-impl";
import { MerkleState, MerkleStateMap } from "@/merklization/merkle-state";
import { IdentityMap } from "@/data-structures/identity-map";
import { SafeMap } from "@/data-structures/safe-map";
import { serviceAccountDataCodec } from "@/merklization/state-codecs";
import { stateKey } from "@/merklization/utils";
import { E_sub_int, encodeWithCodec, E_4_int } from "@tsjam/codec";
import { MerkleServiceAccountStorageImpl } from "./merkle-account-data-storage-impl";
import { ServiceAccountImpl } from "./service-account-impl";

export class JamStateImpl implements JamState {
  /**
   * The block which produced this state
   * or undefined if state was reconstructed without block
   */
  block?: JamBlockImpl;
  /**
   * `α`
   */
  authPool!: AuthorizerPoolImpl;

  /**
   * `β`
   */
  beta!: BetaImpl;

  /**
   * `γ`
   */
  safroleState!: SafroleStateImpl;

  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda!: Tagged<LambdaImpl, "lambda">;

  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa!: Tagged<KappaImpl, "kappa">;

  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota!: Tagged<ValidatorsImpl, "iota">;

  /**
   * `δ`
   */
  serviceAccounts!: DeltaImpl;

  /**
   * `η`
   */
  entropy!: JamEntropyImpl;

  /**
   * `φ`
   */
  authQueue!: AuthorizerQueueImpl;

  /**
   * `χ`
   */
  privServices!: PrivilegedServicesImpl;

  /**
   * `ψ`
   */
  disputes!: DisputesStateImpl;

  /**
   * `π`
   */
  statistics!: JamStatisticsImpl;

  /**
   * `ω`
   */
  accumulationQueue!: AccumulationQueueImpl;

  /**
   * `ξ`
   */
  accumulationHistory!: AccumulationHistoryImpl;

  /**
   * `ρ`
   */
  rho!: RHOImpl;

  /**
   * `τ` - the most recent block timeslot
   */
  slot!: TauImpl;

  /**
   * `θ` - `\lastaccout`
   */
  mostRecentAccumulationOutputs!: LastAccOutsImpl;

  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory!: HeaderLookupHistoryImpl;

  #merkleState?: MerkleState;

  constructor(
    config: Omit<ConditionalExcept<JamStateImpl, Function>, "merkle">,
  ) {
    Object.assign(this, config);
  }

  get merkle(): MerkleState {
    if (typeof this.#merkleState === "undefined") {
      this.#merkleState = MerkleState.fromState(this);
    }
    return this.#merkleState;
  }

  merkleRoot(): StateRootHash {
    return this.merkle.root;
  }

  applyBlock(
    newBlock: JamBlockImpl,
  ): Result<
    Posterior<JamStateImpl>,
    | DisputesToPosteriorError
    | DisputesVerdictError
    | DisputesCulpritError
    | DisputesFaultError
    | GammaAError
    | EAValidationError
    | ETError
    | EPError
    | EGError
    | TauError
    | HeaderValidationError
  > {
    assert(this.block, "Cannot apply block to a state without a block");

    // $(0.7.1 - 6.1)
    const proposed_p_tau = toPosterior(newBlock.header.slot);

    const [tauErr, p_tau] = proposed_p_tau.checkPTauValid(this.slot).safeRet();
    if (typeof tauErr !== "undefined") {
      return err(tauErr);
    }

    // $(0.7.1 - 6.13)
    const p_kappa = this.kappa.toPosterior(this, { p_tau });
    const p_lambda = this.lambda.toPosterior(this, { p_tau });

    const p_entropy = this.entropy
      .rotate1_3({
        slot: this.slot,
        p_tau,
      })
      .toPosterior({
        vrfOutputHash: Bandersnatch.vrfOutputSignature(
          newBlock.header.entropySource,
        ),
      });
    const [dispExErr, disputesExtrinsic] = newBlock.extrinsics.disputes
      .checkValidity({
        disputesState: this.disputes,
        tau: this.slot,
        kappa: this.kappa,
        lambda: this.lambda,
      })
      .safeRet();

    if (typeof dispExErr !== "undefined") {
      return err(dispExErr);
    }

    const [p_disputesError, p_disputes] = this.disputes
      .toPosterior({
        kappa: this.kappa,
        lambda: this.lambda,
        extrinsic: disputesExtrinsic,
      })
      .safeRet();
    if (typeof p_disputesError !== "undefined") {
      return err(p_disputesError);
    }

    const p_gamma_p = this.safroleState.gamma_p.toPosterior({
      slot: this.slot,
      iota: this.iota,
      p_tau,
      p_offenders: toPosterior(p_disputes.offenders),
    });
    const p_gamma_z = this.safroleState.gamma_z.toPosterior({
      slot: this.slot,
      p_tau,
      p_gamma_p,
    });

    const [newTicketsErr, newTickets] = newBlock.extrinsics.tickets
      .newTickets({
        p_tau,
        p_gamma_z,
        gamma_a: this.safroleState.gamma_a,
        p_entropy,
      })
      .safeRet();

    if (typeof newTicketsErr !== "undefined") {
      return err(newTicketsErr);
    }

    const p_gamma_s = this.safroleState.gamma_s.toPosterior({
      slot: this.slot,
      safroleState: this.safroleState,
      p_tau,
      p_kappa,
      p_eta2: toPosterior(p_entropy._2),
    });

    const [p_gamma_aErr, p_gamma_a] = this.safroleState.gamma_a
      .toPosterior({
        slot: this.slot,
        p_tau,
        newTickets,
      })
      .safeRet();
    if (typeof p_gamma_aErr !== "undefined") {
      return err(p_gamma_aErr);
    }

    const p_safroleState = this.safroleState.toPosterior({
      p_gamma_p,
      p_gamma_z,
      p_gamma_a,
      p_gamma_s,
    });

    //now we can check the header
    const [headerErr] = newBlock.header
      .checkValidity({
        disputesExtrinsic,
        p_kappa,
        extrinsicHash: newBlock.extrinsics.extrinsicHash(),
        curState: this,
        prevHeader: this.block.header,
        p_entropy_3: toPosterior(p_entropy._3),
        p_gamma_s,
        p_gamma_p,
      })
      .safeRet();

    if (typeof headerErr !== "undefined") {
      return err(headerErr);
    }

    const d_rho = this.rho.toDagger({ p_disputes });
    const [eaError, validatedEA] = newBlock.extrinsics.assurances
      .checkValidity({
        headerParent: this.block.header.signedHash(),
        kappa: this.kappa,
        d_rho,
      })
      .safeRet();
    if (typeof eaError !== "undefined") {
      return err(eaError);
    }

    const bold_R = validatedEA.newlyAvailableReports(d_rho);

    const {
      p_accumulationHistory,
      p_accumulationQueue,
      p_mostRecentAccumulationOutputs,
      deferredTransfers,
      p_privServices,
      d_delta,
      p_iota,
      p_authQueue,
      accumulationStatistics,
    } = accumulateReports(bold_R, {
      tau: this.slot,
      p_tau,
      accumulationHistory: this.accumulationHistory,
      accumulationQueue: this.accumulationQueue,
      authQueue: this.authQueue,
      serviceAccounts: this.serviceAccounts,
      privServices: this.privServices,
      iota: this.iota,
      p_eta_0: toPosterior(p_entropy._0),
    });
    const d_beta = this.beta.toDagger(newBlock.header.parentStateRoot);
    const invokedTransfers = deferredTransfers.invokedTransfers({
      d_delta,
      p_tau,
      p_eta_0: p_entropy._0,
    });

    const dd_delta = d_delta.toDoubleDagger({
      p_tau,
      invokedTransfers,
      accumulationStatistics,
    });

    const [epError, validatedEP] = newBlock.extrinsics.preimages
      .checkValidity({ serviceAccounts: this.serviceAccounts })
      .safeRet();

    if (epError) {
      return err(epError);
    }

    const p_delta = dd_delta.toPosterior({
      p_tau,
      ep: validatedEP,
    });

    const dd_rho = d_rho.toDoubleDagger({
      p_tau,
      newReports: bold_R,
      rho: this.rho,
    });

    const [egError, validatedEG] = newBlock.extrinsics.reportGuarantees
      .checkValidity({
        beta: this.beta,
        rho: this.rho,
        accumulationHistory: this.accumulationHistory,
        accumulationQueue: this.accumulationQueue,
        authPool: this.authPool,
        headerLookupHistory: this.headerLookupHistory,
        serviceAccounts: this.serviceAccounts,

        dd_rho,
        d_recentHistory: toDagger(d_beta.recentHistory),
        p_eta2: p_entropy._2,
        p_eta3: p_entropy._3,
        p_kappa,
        p_lambda,
        p_offenders: toPosterior(p_disputes.offenders),
        p_tau,
      })
      .safeRet();
    if (typeof egError !== "undefined") {
      return err(egError);
    }

    const p_rho = dd_rho.toPosterior({
      p_tau,
      EG_Extrinsic: validatedEG,
    });

    const headerHash = newBlock.header.signedHash();

    const p_beta = d_beta.toPosterior({
      headerHash,
      eg: validatedEG,
      p_theta: p_mostRecentAccumulationOutputs,
    });

    const p_statistics = this.statistics.toPosterior({
      tau: this.slot,
      p_tau,
      extrinsics: newBlock.extrinsics,
      ea: validatedEA,
      ep: validatedEP,
      d_rho,
      p_offenders: toPosterior(p_disputes.offenders),
      authorIndex: newBlock.header.authorIndex,
      p_eta2: p_entropy._2,
      p_eta3: p_entropy._3,
      p_kappa,
      p_lambda,
      accumulationStatistics,
      transferStatistics: deferredTransfers.statistics(invokedTransfers),
    });

    const p_authPool = this.authPool.toPosterior({
      p_tau,
      eg: validatedEG,
      p_queue: p_authQueue,
    });

    const p_headerLookupHistory = this.headerLookupHistory.toPosterior({
      header: newBlock.header,
    });

    const p_state = toPosterior(
      new JamStateImpl({
        block: newBlock,
        entropy: p_entropy,
        slot: newBlock.header.slot,
        iota: toTagged(p_iota),
        authPool: p_authPool,
        authQueue: p_authQueue,
        safroleState: p_safroleState,
        statistics: p_statistics,
        rho: p_rho,
        serviceAccounts: p_delta,
        beta: p_beta,
        accumulationQueue: p_accumulationQueue,
        accumulationHistory: p_accumulationHistory,
        privServices: p_privServices,
        lambda: toTagged(p_lambda),
        kappa: toTagged(p_kappa),
        disputes: p_disputes,
        headerLookupHistory: p_headerLookupHistory,
        mostRecentAccumulationOutputs: p_mostRecentAccumulationOutputs,
      }),
    );

    return ok(p_state);
  }

  static fromMerkleMap(merkleMap: MerkleStateMap) {
    const authPool = AuthorizerPoolImpl.decode(
      merkleMap.get(stateKey(1))!,
    ).value;

    const authQueue = AuthorizerQueueImpl.decode(
      merkleMap.get(stateKey(2))!,
    ).value;

    const beta = BetaImpl.decode(merkleMap.get(stateKey(3))!).value;

    const safroleState = SafroleStateImpl.decode(
      merkleMap.get(stateKey(4))!,
    ).value;

    const disputes = DisputesStateImpl.decode(
      merkleMap.get(stateKey(5))!,
    ).value;

    const entropy = JamEntropyImpl.decode(merkleMap.get(stateKey(6))!).value;

    const iota = ValidatorsImpl.decode(merkleMap.get(stateKey(7))!).value;

    const kappa = KappaImpl.decode(merkleMap.get(stateKey(8))!).value;

    const lambda = LambdaImpl.decode(merkleMap.get(stateKey(9))!).value;

    const rho = RHOImpl.decode(merkleMap.get(stateKey(10))!).value;

    const slot = <TauImpl>SlotImpl.decode(merkleMap.get(stateKey(11))!).value;

    const privServices = PrivilegedServicesImpl.decode(
      merkleMap.get(stateKey(12))!,
    ).value;

    const statistics = JamStatisticsImpl.decode(
      merkleMap.get(stateKey(13))!,
    ).value;

    const accumulationQueue = AccumulationQueueImpl.decode(
      merkleMap.get(stateKey(14))!,
    ).value;

    const accumulationHistory = AccumulationHistoryImpl.decode(
      merkleMap.get(stateKey(15))!,
    ).value;

    const mostRecentAccumulationOutputs = LastAccOutsImpl.decode(
      merkleMap.get(stateKey(16))!,
    ).value;

    const serviceKeys = [...merkleMap.keys()].filter((k) => {
      return (
        k[0] === 255 &&
        k[2] === 0 &&
        k[4] === 0 &&
        k[6] === 0 &&
        k[8] === 0 &&
        k[9] === 0 &&
        32 + 5 * 8 + 4 * 4 === merkleMap.get(k)!.length
      );
    });

    const serviceAccounts = new DeltaImpl();
    for (const serviceDataKey of serviceKeys) {
      const serviceKey = Buffer.from([
        serviceDataKey[1],
        serviceDataKey[3],
        serviceDataKey[5],
        serviceDataKey[7],
      ]);
      const serviceData = serviceAccountDataCodec.decode(
        merkleMap.get(serviceDataKey)!,
      ).value;

      const serviceIndex = E_sub_int<ServiceIndex>(4).decode(serviceKey).value;
      // filter out service data keys that are related to this service
      const serviceRelatedKeys = new Set(
        [...merkleMap.keys()].filter((k) => {
          return (
            k[0] === serviceKey[0] &&
            k[2] === serviceKey[1] &&
            k[4] === serviceKey[2] &&
            k[6] === serviceKey[3]
          );
        }),
      );
      const storage = new MerkleServiceAccountStorageImpl(
        serviceIndex,
        <u64>serviceData.totalOctets,
        <u32>serviceData.itemInStorage,
      );

      const serviceAccount = new ServiceAccountImpl(
        {
          codeHash: serviceData.codeHash,
          balance: serviceData.balance,
          minAccGas: serviceData.minAccGas,
          minMemoGas: serviceData.minMemoGas,
          gratis: serviceData.gratis,
          created: serviceData.created,
          lastAcc: serviceData.lastAcc,
          parent: serviceData.parent,
          preimages: new IdentityMap(),
        },
        storage,
      );

      const preimage_p_keys = [...serviceRelatedKeys.values()].filter((sk) => {
        const possiblePreimage = merkleMap.get(sk)!;
        const h = Hashing.blake2b(possiblePreimage);

        const p_p_key = stateKey(
          serviceIndex,
          Buffer.concat([encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2)), h]),
        );
        return Buffer.compare(p_p_key, sk) === 0;
      });
      for (const preimagekey of preimage_p_keys) {
        const preimage = merkleMap.get(preimagekey)!;
        const h = Hashing.blake2b(preimage);
        serviceAccount.preimages.set(h, preimage);
        // we delete to not set it in storage
        serviceRelatedKeys.delete(preimagekey);
      }

      for (const storageOrRequestKey of serviceRelatedKeys) {
        storage.setStorage(
          storageOrRequestKey,
          merkleMap.get(storageOrRequestKey)!,
        );
      }

      serviceAccounts.set(serviceIndex, serviceAccount);
    }

    return new JamStateImpl({
      accumulationHistory,
      accumulationQueue,
      authPool,
      authQueue,
      beta,
      disputes,
      entropy,
      iota: toTagged(iota),
      kappa: toTagged(kappa),
      lambda: toTagged(lambda),
      mostRecentAccumulationOutputs,
      privServices,
      rho,
      safroleState,
      serviceAccounts,
      slot,
      statistics,
      headerLookupHistory: new HeaderLookupHistoryImpl(new SafeMap()),
    });
  }
}
