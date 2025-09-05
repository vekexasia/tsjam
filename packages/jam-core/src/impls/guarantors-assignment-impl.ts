import { FisherYatesH } from "@/fisher-yates";
import {
  CORES,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
} from "@tsjam/constants";
import {
  CoreIndex,
  ED25519PublicKey,
  GuarantorsAssignment,
  Hash,
  JamEntropy,
  Posterior,
  SeqOfLength,
  Tagged,
  u32,
  Validated,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "assert";
import { DisputesStateImpl } from "./disputes-state-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { JamStateImpl } from "./jam-state-impl";
import { SlotImpl, TauImpl } from "./slot-impl";

/**
 * Guarantors assignments. Every block each core has 3 validators assigned to guarantee work reports for it
 * `bold M`
 * $(0.7.1 - 11.18)
 */
export class GuarantorsAssignmentImpl implements GuarantorsAssignment {
  /**
   * `c` - the core index
   */
  validatorsAssignedCore: SeqOfLength<CoreIndex, typeof NUMBER_OF_VALIDATORS>;

  /**
   * `k` - the validators' public key
   */
  validatorsED22519Key: SeqOfLength<
    ED25519PublicKey,
    typeof NUMBER_OF_VALIDATORS
  >;

  constructor(config: {
    validatorsAssignedCore: CoreIndex[];
    validatorsED22519Key: ED25519PublicKey[];
  }) {
    assert(config.validatorsAssignedCore.length === NUMBER_OF_VALIDATORS);
    assert(config.validatorsED22519Key.length === NUMBER_OF_VALIDATORS);
    this.validatorsAssignedCore = toTagged(config.validatorsAssignedCore);
    this.validatorsED22519Key = toTagged(config.validatorsED22519Key);
  }

  /**
   * Creates `M` for current rotation
   *
   * $(0.7.1 - 11.19 / 11.20 / 11.21)
   */
  static curRotation(deps: {
    p_eta2: Posterior<JamEntropy["_2"]>;
    p_tau: Validated<Posterior<TauImpl>>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  }) {
    return M_fn({
      entropy: deps.p_eta2,
      tauOffset: <u32>0,
      validatorKeys: deps.p_kappa,
      p_offenders: deps.p_offenders,
      p_tau: deps.p_tau,
    });
  }

  /**
   * $(0.7.1 - 11.22)
   * M*
   */
  static prevRotation(deps: {
    p_eta2: Posterior<JamEntropyImpl["_2"]>;
    p_eta3: Posterior<JamEntropyImpl["_3"]>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
    p_tau: Validated<Posterior<TauImpl>>;
  }): Tagged<GuarantorsAssignmentImpl, "M*"> {
    return toTagged(
      M_STAR_fn({
        p_eta2: deps.p_eta2,
        p_eta3: deps.p_eta3,
        p_kappa: deps.p_kappa,
        p_lambda: deps.p_lambda,
        p_offenders: deps.p_offenders,
        p_tau: deps.p_tau,
      }),
    );
  }
}

const M_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Validated<Posterior<TauImpl>>;
  validatorKeys: Posterior<JamStateImpl["kappa"] | JamStateImpl["lambda"]>;
  p_offenders: Posterior<DisputesStateImpl["offenders"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number): CoreIndex[] =>
    c.map<CoreIndex>((x) => <CoreIndex>((x + n) % CORES));
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: TauImpl) => {
    return R(
      FisherYatesH(
        Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) =>
          Math.floor((CORES * i) / NUMBER_OF_VALIDATORS),
        ),
        e,
      ),
      Math.floor((t.value % EPOCH_LENGTH) / VALIDATOR_CORE_ROTATION),
    );
  };
  return new GuarantorsAssignmentImpl({
    // c
    validatorsAssignedCore: P(
      input.entropy,
      toTagged(new SlotImpl(<u32>(input.p_tau.value + input.tauOffset))),
    ),
    // k
    validatorsED22519Key: input.validatorKeys
      .phi(input.p_offenders)
      .elements.map((v) => v.ed25519),
  });
};

const M_STAR_fn = (input: {
  p_eta2: Posterior<JamEntropy["_2"]>;
  p_eta3: Posterior<JamEntropy["_3"]>;
  p_kappa: Posterior<JamStateImpl["kappa"]>;
  p_lambda: Posterior<JamStateImpl["lambda"]>;
  p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  p_tau: Validated<Posterior<TauImpl>>;
}) => {
  if (
    new SlotImpl(
      <u32>(input.p_tau.value - VALIDATOR_CORE_ROTATION),
    ).epochIndex() == input.p_tau.epochIndex()
  ) {
    return M_fn({
      entropy: input.p_eta2,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_offenders: input.p_offenders,
    });
  } else {
    return M_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_offenders: input.p_offenders,
    });
  }
};
