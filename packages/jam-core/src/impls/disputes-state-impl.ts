import { BaseJamCodecable, JamCodecable, xBytesCodec } from "@tsjam/codec";
import {
  ED25519PublicKey,
  Hash,
  IDisputesState,
  Posterior,
  Validated,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import type { ConditionalExcept } from "type-fest";
import type { JamStateImpl } from "./jam-state-impl";
import type { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet, identitySetCodec } from "@/data-structures/identity-set";
import {
  DisputesVerdicts as DisputesVerdicts,
  VerdictVoteKind,
} from "./extrinsics/disputes/verdicts";

/**
 * Codec follows C(5) from $(0.7.1 - D.2)
 *
 * `X`
 * $(0.7.1 - 10.1)
 */
@JamCodecable()
export class DisputesStateImpl
  extends BaseJamCodecable
  implements IDisputesState
{
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */
  @identitySetCodec(HashCodec)
  good!: IdentitySet<Hash>;
  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  @identitySetCodec(HashCodec)
  bad!: IdentitySet<Hash>;
  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  @identitySetCodec(HashCodec)
  wonky!: IdentitySet<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  @identitySetCodec(xBytesCodec(32))
  offenders!: IdentitySet<ED25519PublicKey>;

  constructor(config?: ConditionalExcept<DisputesStateImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  /**
   * Computes state transition for disputes state
   * $(0.7.1 - 4.11)
   */
  toPosterior(deps: {
    kappa: JamStateImpl["kappa"];
    lambda: JamStateImpl["lambda"];
    extrinsic: Validated<DisputeExtrinsicImpl>;
  }): Result<Posterior<DisputesStateImpl>, DisputesToPosteriorError> {
    const bold_v = (<Validated<DisputesVerdicts>>(
      deps.extrinsic.verdicts
    )).votes();

    const p_state = new DisputesStateImpl({
      // $(0.7.1 - 10.16)
      good: new IdentitySet([
        ...this.good,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.TWO_THIRD_PLUS_ONE)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.17)
      bad: new IdentitySet([
        ...this.bad,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.ZERO)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.18)
      wonky: new IdentitySet([
        ...this.wonky,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.ONE_THIRD)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.19)
      offenders: new IdentitySet([
        ...this.offenders,
        ...deps.extrinsic.culprits.elements.map(({ key }) => key),
        ...deps.extrinsic.faults.elements.map(({ key }) => key),
      ]),
    });

    // $(0.7.1 - 10.5) - end
    // culprit `r` should be in psi_b'
    for (let i = 0; i < deps.extrinsic.culprits.elements.length; i++) {
      const { target } = deps.extrinsic.culprits.elements[i];
      if (!p_state.bad.has(target)) {
        return err(DisputesToPosteriorError.CULPRIT_NOT_IN_PSIB);
      }
    }

    // perform some other last checks
    // $(0.7.1 - 10.6) - end
    // faults reports should be in psi_b' or psi_g'
    for (let i = 0; i < deps.extrinsic.faults.elements.length; i++) {
      const { target, vote } = deps.extrinsic.faults.elements[i];
      if (vote) {
        if (!(p_state.bad.has(target) && !p_state.good.has(target))) {
          return err(
            DisputesToPosteriorError.VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO,
          );
        }
      } else {
        if (!(!p_state.bad.has(target) && p_state.good.has(target))) {
          return err(
            DisputesToPosteriorError.INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO,
          );
        }
      }
    }

    return ok(toPosterior(p_state));
  }

  static newEmpty(): DisputesStateImpl {
    return new DisputesStateImpl({
      good: new IdentitySet(),
      bad: new IdentitySet(),
      wonky: new IdentitySet(),
      offenders: new IdentitySet(),
    });
  }
}

export enum DisputesToPosteriorError {
  EPOCH_INDEX_WRONG = "epochIndex is wrong",
  CUPLRIT_SIGNATURE_INVALID = "culprit signature is invalid",
  CULPRIT_HASH_MUST_REFERENCE_VERDICT = "culprit.hash must reference a verdict",
  FAULT_SIGNATURE_INVALID = "fault signature is invalid",
  VERDICTS_NOT_FROM_CURRENT_EPOCH = "verdicts must be for the current or previous epoch",
  CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY = "culprit must be ordered/unique by .ed25519PublicKey",
  FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY = "faults must be ordered/unique by .ed25519PublicKey",
  VERDICTS_IN_PSI_G = "verdict.hash must not be in psi_g",
  VERDICTS_IN_PSI_B = "verdict.hash must not be in psi_b",
  VERDICTS_IN_PSI_W = "verdict.hash must not be in psi_w",
  JUDGEMENTS_NOT_ORDERED_BY_VALIDATOR_INDEX = "judgements must be ordered/unique by .validatorIndex",
  VERDICTS_NUM_VALIDATORS = "judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS",
  POSITIVE_VERDICTS_NOT_IN_FAULTS = "positive verdicts must be in faults",
  NEGATIVE_VERDICTS_NOT_IN_CULPRIT = "negative verdicts must have at least 2 in culprit",
  VERDICT_SIGNATURE_INVALID = "verdict signature is invalid",
  VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO = "with fault validity 1, the report must be in psi_b' and not in psi_o'",
  INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO = "with fault validity 0, the report must NOT be in psi_b' and in psi_o'",
  CULPRIT_NOT_IN_PSIB = "CULPRIT_NOT_IN_PSIB",
  CULPRITKEYNOTINK = "one or more culprit key is not in bold_k",
  FAULTKEYNOTINK = "one or more fault key is not in bold_k",
}
