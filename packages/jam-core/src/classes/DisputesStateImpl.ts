import {
  BaseJamCodecable,
  BigIntBytesJSONCodec,
  Ed25519PubkeyBigIntCodec,
  encodeWithCodec,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  lengthDiscriminatedSetCodec,
} from "@tsjam/codec";
import { JAM_GUARANTEE, JAM_INVALID, JAM_VALID } from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import {
  ED25519PublicKey,
  Hash,
  IDisputesState,
  Posterior,
  Validated,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { JamStateImpl } from "./JamStateImpl";
import { DisputeExtrinsicImpl, VerdictVoteKind } from "./extrinsics/disputes";

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

  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  good!: Set<Hash>;
  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  bad!: Set<Hash>;
  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  wonky!: Set<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  @lengthDiscriminatedSetCodec({
    ...Ed25519PubkeyBigIntCodec,
    ...BigIntBytesJSONCodec<ED25519PublicKey["bigint"], 32>(
      Ed25519PubkeyBigIntCodec,
    ),
  })
  offenders!: Set<ED25519PublicKey["bigint"]>;

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
  toPosterior(
    curState: JamStateImpl,
    deps: {
      extrinsic: Validated<DisputeExtrinsicImpl>;
    },
  ): Result<Posterior<DisputesStateImpl>, DisputesToPosteriorError> {
    const bold_k = new Set([
      ...curState.kappa.elements.map((v) => v.ed25519.bigint),
      ...curState.lambda.elements.map((v) => v.ed25519.bigint),
    ]);

    // remove offenders
    this.offenders.forEach((offender) => bold_k.delete(offender));

    // check culprit key is in lambda or kappa
    // $(0.7.1 - 10.5) - partial
    const checkCulpritKeys = deps.extrinsic.culprits.every(({ key }) =>
      bold_k.has(key.bigint),
    );
    if (!checkCulpritKeys) {
      return err(DisputesToPosteriorError.CULPRITKEYNOTINK);
    }

    // check faults key is in lambda or kappa
    // $(0.7.1 - 10.6) - partial
    const checkFaultKeys = deps.extrinsic.faults.every(({ key }) =>
      bold_k.has(key.bigint),
    );
    if (!checkFaultKeys) {
      return err(DisputesToPosteriorError.FAULTKEYNOTINK);
    }

    // check culprit signature is valid
    // $(0.7.1 - 10.5) - partial
    const _checkculprit = deps.extrinsic.culprits.map((culprit) => {
      const verified = Ed25519.verifySignature(
        culprit.signature,
        culprit.key,
        new Uint8Array([
          ...JAM_GUARANTEE,
          ...encodeWithCodec(HashCodec, culprit.target),
        ]),
      );
      if (!verified) {
        return err(DisputesToPosteriorError.CUPLRIT_SIGNATURE_INVALID);
      }
      return ok(null as unknown as Posterior<IDisputesState>);
    });
    if (_checkculprit.some((res) => res.isErr())) {
      return _checkculprit.find((res) => res.isErr())!;
    }

    // enforce faults signature is valid
    // $(0.7.1 - 10.6) - partial
    const _checkfaults = deps.extrinsic.faults.map((fault) => {
      const verified = Ed25519.verifySignature(
        fault.signature,
        fault.key,
        new Uint8Array([
          ...(fault.vote ? JAM_VALID : JAM_INVALID),
          ...encodeWithCodec(HashCodec, fault.target),
        ]),
      );
      if (!verified) {
        return err(DisputesToPosteriorError.FAULT_SIGNATURE_INVALID);
      }
      return ok(null as unknown as Posterior<IDisputesState>);
    });
    if (_checkfaults.some((res) => res.isErr())) {
      return _checkfaults.find((res) => res.isErr())!;
    }

    // enforce verdicts are ordered and not duplicated by report hash
    // $(0.7.1 - 10.7)
    for (let i = 1; i < deps.extrinsic.verdicts.length; i++) {
      const [prev, curr] = [
        deps.extrinsic.verdicts[i - 1],
        deps.extrinsic.verdicts[i],
      ];
      if (prev.target >= curr.target) {
        return err(
          DisputesToPosteriorError.VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH,
        );
      }
    }

    // enforce culprit are ordered by ed25519PublicKey
    // $(0.7.1 - 10.8)
    if (deps.extrinsic.culprits.length > 0) {
      for (let i = 1; i < deps.extrinsic.culprits.length; i++) {
        const [prev, curr] = [
          deps.extrinsic.culprits[i - 1],
          deps.extrinsic.culprits[i],
        ];
        if (prev.key.bigint >= curr.key.bigint) {
          return err(
            DisputesToPosteriorError.CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
          );
        }
      }
    }

    // enforce faults are ordered by ed25519PublicKey
    // $(0.7.1 - 10.8)
    if (deps.extrinsic.faults.length > 0) {
      for (let i = 1; i < deps.extrinsic.faults.length; i++) {
        const [prev, curr] = [
          deps.extrinsic.faults[i - 1],
          deps.extrinsic.faults[i],
        ];
        if (prev.key.bigint >= curr.key.bigint) {
          return err(
            DisputesToPosteriorError.FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
          );
        }
      }
    }

    // ensure verdict report hashes are not in psi_g or psi_b or psi_w
    // aka not in the set of work reports that were judged to be valid, bad or wonky already
    // $(0.7.1 - 10.9)
    for (const verdict of deps.extrinsic.verdicts) {
      if (this.good.has(verdict.target)) {
        return err(DisputesToPosteriorError.VERDICTS_IN_PSI_G);
      }
      if (this.bad.has(verdict.target)) {
        return err(DisputesToPosteriorError.VERDICTS_IN_PSI_B);
      }
      if (this.wonky.has(verdict.target)) {
        return err(DisputesToPosteriorError.VERDICTS_IN_PSI_W);
      }
    }

    // ensure judgements are ordered by validatorIndex and no duplicates
    // $(0.7.1 - 10.10)
    if (
      false ===
      deps.extrinsic.verdicts.every((verdict) => {
        for (let i = 1; i < verdict.judgements.length; i++) {
          if (verdict.judgements[i - 1].index >= verdict.judgements[i].index) {
            return false;
          }
        }
        return true;
      })
    ) {
      return err(
        DisputesToPosteriorError.JUDGEMENTS_NOT_ORDERED_BY_VALIDATOR_INDEX,
      );
    }

    const bold_v = deps.extrinsic.verdictsVotes();

    const negativeVerdicts = bold_v.filter(
      (v) => v.votes === VerdictVoteKind.ZERO,
    );
    const positiveVerdicts = bold_v.filter(
      (v) => v.votes === VerdictVoteKind.TWO_THIRD_PLUS_ONE,
    );

    // ensure any positive verdicts are in faults
    // $(0.7.1 - 10.13)
    if (
      false ===
      positiveVerdicts.every(
        (v) => !deps.extrinsic.faults.some((f) => f.target === v.reportHash),
      )
    ) {
      return err(DisputesToPosteriorError.POSITIVE_VERDICTS_NOT_IN_FAULTS);
    }

    // ensure any negative verdicts have at least 2 in cuprit
    // $(0.7.1 - 10.14)
    if (
      false ===
      negativeVerdicts.every((v) => {
        if (
          deps.extrinsic.culprits.filter((c) => c.target === v.reportHash)
            .length < 2
        ) {
          return false;
        }
        return true;
      })
    ) {
      return err(DisputesToPosteriorError.NEGATIVE_VERDICTS_NOT_IN_CULPRIT);
    }

    const p_state = new DisputesStateImpl({
      // $(0.7.1 - 10.16)
      good: new Set([
        ...this.good,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.TWO_THIRD_PLUS_ONE)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.17)
      bad: new Set([
        ...this.bad,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.ZERO)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.18)
      wonky: new Set([
        ...this.wonky,
        ...bold_v
          .filter(({ votes }) => votes == VerdictVoteKind.ONE_THIRD)
          .map(({ reportHash }) => reportHash),
      ]),

      // $(0.7.1 - 10.19)
      offenders: new Set([
        ...this.offenders,
        ...deps.extrinsic.culprits.map(({ key }) => key.bigint),
        ...deps.extrinsic.faults.map(({ key }) => key.bigint),
      ]),
    });

    // $(0.7.1 - 10.5) - end
    // culprit `r` should be in psi_b'
    for (let i = 0; i < deps.extrinsic.culprits.length; i++) {
      const { target } = deps.extrinsic.culprits[i];
      if (!p_state.bad.has(target)) {
        return err(DisputesToPosteriorError.CULPRIT_NOT_IN_PSIB);
      }
    }

    // perform some other last checks
    // $(0.7.1 - 10.6) - end
    // faults reports should be in psi_b' or psi_g'
    for (let i = 0; i < deps.extrinsic.faults.length; i++) {
      const { target, vote } = deps.extrinsic.faults[i];
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
}

export enum DisputesToPosteriorError {
  EPOCH_INDEX_WRONG = "epochIndex is wrong",
  CUPLRIT_SIGNATURE_INVALID = "culprit signature is invalid",
  CULPRIT_HASH_MUST_REFERENCE_VERDICT = "culprit.hash must reference a verdict",
  VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH = "verdicts must be ordered/unique by .hash",
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
  CULPRIT_NOT_IN_PSIB = "culprit must be in psi_b'",
  CULPRITKEYNOTINK = "one or more culprit key is not in bold_k",
  FAULTKEYNOTINK = "one or more fault key is not in bold_k",
}
