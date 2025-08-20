import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { TauImpl } from "@/impls/slot-impl";
import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  booleanCodec,
  codec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import {
  JAM_INVALID,
  JAM_VALID,
  MINIMUM_VALIDATORS,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import type {
  DisputeVerdict,
  DisputeVerdictJudgement,
  ED25519Signature,
  Hash,
  SeqOfLength,
  Tagged,
  u32,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";

@JamCodecable()
export class DisputeVerdictJudgementImpl
  extends BaseJamCodecable
  implements DisputeVerdictJudgement
{
  /**
   * `v` - the validity of the work report
   * 0 - valid
   * 1 - invalid
   */
  @booleanCodec()
  vote!: boolean;
  /**
   * `i` - the validator index
   * the index of the validator in the validator set for the specified epoch
   */
  @eSubIntCodec(2)
  index!: ValidatorIndex;
  /**
   * `s` - the signature of the validator
   * the signature of the validator
   * the signature must be either
   *  - $jam_valid + workReportHash
   *  - $jam_invalid + workReportHash
   */
  @codec(xBytesCodec(64))
  signature!: ED25519Signature;

  isSignatureValid(deps: {
    target: Hash;
    validatorSet: KappaImpl | LambdaImpl;
  }): boolean {
    const validatorPubKey = deps.validatorSet.at(this.index).ed25519;
    let message: Uint8Array;
    if (this.vote) {
      message = new Uint8Array([...JAM_VALID, ...deps.target]);
    } else {
      message = new Uint8Array([...JAM_INVALID, ...deps.target]);
    }
    const signatureVerified = Ed25519.verifySignature(
      this.signature,
      validatorPubKey,
      message,
    );
    if (!signatureVerified) {
      return false;
    }
    return true;
  }

  checkValidity(deps: {
    target: Hash;
    validatorSet: KappaImpl | LambdaImpl;
  }): Result<Validated<DisputeVerdictJudgementImpl>, DisputesVerdictError> {
    if (this.index >= NUMBER_OF_VALIDATORS) {
      return err(DisputesVerdictError.INVALID_JUDGEMENT_INDEX);
    }
    if (!this.isSignatureValid(deps)) {
      return err(DisputesVerdictError.JUDGEMENT_SIGNATURE_WRONG);
    }
    return ok(toTagged(this));
  }
}

@JamCodecable()
export class DisputeVerdictImpl
  extends BaseJamCodecable
  implements DisputeVerdict
{
  /**
   * `r` - the hash of the work report
   */
  @codec(HashCodec)
  target!: Hash;
  /**
   * `a` - Defines which epoch index the validators reporting the verdict are referring to
   * it can be either current or previous epoch
   */
  @eSubIntCodec(4)
  age!: Tagged<u32, "epoch-index">;
  /**
   * `j` - the length of this sequence must be = 2/3+1
   *
   * the sequence must be ordered by .validatorIndex
   */
  @sequenceCodec(MINIMUM_VALIDATORS, DisputeVerdictJudgementImpl, "votes")
  judgements!: SeqOfLength<
    DisputeVerdictJudgementImpl,
    typeof MINIMUM_VALIDATORS
  >;

  checkValidity(deps: {
    tau: TauImpl;
    kappa: KappaImpl;
    lambda: LambdaImpl;
    disputesState: DisputesStateImpl;
  }): Result<Validated<DisputeVerdictImpl>, DisputesVerdictError> {
    // $(0.7.1 - 10.2)
    if (this.judgements.length !== MINIMUM_VALIDATORS) {
      return err(DisputesVerdictError.JUDGEMENTS_LENGTH);
    }

    if (
      this.age !== deps.tau.epochIndex() &&
      this.age !== deps.tau.epochIndex() - 1
    ) {
      return err(DisputesVerdictError.EPOCH_INDEX_WRONG);
    }

    if (this.judgements.length !== MINIMUM_VALIDATORS) {
      return err(DisputesVerdictError.JUDGEMENTS_LENGTH_WRONG);
    }

    // $(0.7.1 - 10.3)
    const validatorSet =
      this.age === deps.tau.epochIndex() ? deps.kappa : deps.lambda;

    for (const judgement of this.judgements) {
      if (
        !judgement.isSignatureValid({
          target: this.target,
          validatorSet,
        })
      ) {
        return err(DisputesVerdictError.JUDGEMENT_SIGNATURE_WRONG);
      }
    }

    // ensure verdict report hashes are not in psi_g or psi_b or psi_w
    // aka not in the set of work reports that were judged to be valid, bad or wonky already
    // $(0.7.1 - 10.9)
    if (deps.disputesState.good.has(this.target)) {
      return err(DisputesVerdictError.VERDICTS_IN_PSI_G);
    }
    if (deps.disputesState.bad.has(this.target)) {
      return err(DisputesVerdictError.VERDICTS_IN_PSI_B);
    }
    if (deps.disputesState.wonky.has(this.target)) {
      return err(DisputesVerdictError.VERDICTS_IN_PSI_W);
    }

    // ensure judgements are ordered by validatorIndex and no duplicates
    // $(0.7.1 - 10.10)
    for (let i = 1; i < this.judgements.length; i++) {
      if (this.judgements[i - 1].index >= this.judgements[i].index) {
        return err(DisputesVerdictError.JUDGEMENTS_NOT_ORDERED);
      }
    }

    // we do check if the judgements are either 0, 1/3 or 2/3+1
    // $(0.7.1 - 10.11)
    const nVotes = this.judgements.reduceRight(
      (a, b) => a + (b.vote ? 1 : 0),
      0,
    );
    if (
      nVotes !== 0 &&
      nVotes !== Math.floor(NUMBER_OF_VALIDATORS / 3) &&
      nVotes !== MINIMUM_VALIDATORS
    ) {
      return err(DisputesVerdictError.JUDGEMENTS_WRONG);
    }

    return ok(toTagged(this));
  }
}

@JamCodecable()
export class DisputesVerdicts extends BaseJamCodecable {
  @lengthDiscriminatedCodec(DisputeVerdictImpl, SINGLE_ELEMENT_CLASS)
  elements!: DisputeVerdictImpl[];

  constructor(elements: DisputeVerdictImpl[] = []) {
    super();
    this.elements = elements;
  }
  /**
   * computes bold_v as $(0.7.1 - 10.11 / 10.12)
   * @returns undefined if votes are
   */
  votes(this: Validated<DisputesVerdicts>): Array<{
    reportHash: Hash;
    votes: VerdictVoteKind;
  }>;
  votes(this: DisputesVerdicts): Array<{
    reportHash: Hash;
    votes: VerdictVoteKind | number;
  }>;
  votes(): Array<{ reportHash: Hash; votes: VerdictVoteKind | number }> {
    const bold_v: Array<{
      reportHash: Hash;
      votes: VerdictVoteKind | number;
    }> = this.elements.map((verdict) => {
      const numericVotes = verdict.judgements.reduce(
        (acc, curr) => acc + (curr.vote ? 1 : 0),
        0,
      );
      return {
        reportHash: verdict.target,
        votes:
          numericVotes === 0
            ? VerdictVoteKind.ZERO
            : numericVotes === MINIMUM_VALIDATORS
              ? VerdictVoteKind.TWO_THIRD_PLUS_ONE
              : numericVotes === Math.floor(NUMBER_OF_VALIDATORS / 3)
                ? VerdictVoteKind.ONE_THIRD
                : numericVotes,
      };
    });
    return bold_v;
  }

  checkValidity(deps: {
    tau: TauImpl;
    kappa: KappaImpl;
    lambda: LambdaImpl;
    disputesState: DisputesStateImpl;
  }): Result<Validated<DisputesVerdicts>, DisputesVerdictError> {
    // enforce verdicts are ordered and not duplicated by report hash
    // $(0.7.1 - 10.7)
    for (let i = 1; i < this.elements.length; i++) {
      const [prev, curr] = [this.elements[i - 1], this.elements[i]];
      if (compareUint8Arrays(prev.target, curr.target) >= 0) {
        return err(
          DisputesVerdictError.VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH,
        );
      }
    }

    // check single verdicts validity
    for (const verdict of this.elements) {
      const [vErr] = verdict.checkValidity(deps).safeRet();
      if (typeof vErr !== "undefined") {
        return err(vErr);
      }
    }

    return ok(toTagged(this));
  }

  static empty(): DisputesVerdicts {
    return new DisputesVerdicts([]);
  }
}

export enum VerdictVoteKind {
  ZERO = "zero",
  ONE_THIRD = "one-third",
  TWO_THIRD_PLUS_ONE = "two-third-plus-one",
}

export enum DisputesVerdictError {
  JUDGEMENTS_LENGTH = "JUDGEMENTS_LENGTH",
  EPOCH_INDEX_WRONG = "EPOCH_INDEX_WRONG",
  JUDGEMENTS_LENGTH_WRONG = "JUDGEMENTS_LENGTH_WRONG",
  JUDGEMENT_SIGNATURE_WRONG = "JUDGEMENT_SIGNATURE_WRONG",
  JUDGEMENTS_WRONG = "JUDGEMENTS_WRONG",
  VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH = "VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH",
  INVALID_JUDGEMENT_INDEX = "INVALID_JUDGEMENT_INDEX",
  VERDICTS_IN_PSI_W = "VERDICTS_IN_PSI_W",
  VERDICTS_IN_PSI_B = "VERDICTS_IN_PSI_B",
  VERDICTS_IN_PSI_G = "VERDICTS_IN_PSI_G",
  JUDGEMENTS_NOT_ORDERED = "JUDGEMENTS_NOT_ORDERED",
}
