import {
  BaseJamCodecable,
  booleanCodec,
  ed25519PubkeyCodec,
  ed25519SignatureCodec,
  encodeWithCodec,
  eSubIntCodec,
  HashCodec,
  hashCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  sequenceCodec,
} from "@tsjam/codec";
import { JAM_INVALID, JAM_VALID, MINIMUM_VALIDATORS } from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import {
  DisputeCulprit,
  DisputeExtrinsic,
  DisputeFault,
  DisputeVerdict,
  DisputeVerdictJudgement,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MinSeqLength,
  SeqOfLength,
  Tagged,
  u32,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { JamStateImpl } from "../JamStateImpl";
import { TauImpl } from "../SlotImpl";

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
  @ed25519SignatureCodec()
  signature!: ED25519Signature;
}

@JamCodecable()
export class DisputeVerdictImpl
  extends BaseJamCodecable
  implements DisputeVerdict
{
  /**
   * `r` - the hash of the work report
   */
  @hashCodec()
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
}

@JamCodecable()
export class DisputeCulpritImpl
  extends BaseJamCodecable
  implements DisputeCulprit
{
  /**
   * `r` - the hash of the work report
   * this will alter DisputesState.psi_b by making sure that the work report is in the set
   * @see DisputesState.psi_b
   */
  @hashCodec()
  target!: Hash;
  /**
   * `f` - the validator public key
   * This must be either in the current or prev set of validators
   * it must not be inside DisputesState.psi_o
   * @see DisputesState.psi_o
   */
  @ed25519PubkeyCodec()
  key!: ED25519PublicKey;

  /**
   * `s` - the signature of the garantor payload
   * the payload needs to be $jam_guarantee + workReportHash
   */
  @ed25519SignatureCodec()
  signature!: ED25519Signature;
}

@JamCodecable()
export class DisputeFaultImpl extends BaseJamCodecable implements DisputeFault {
  /**
   * the hash of the work report
   * - if (validity === 0) then the work report must be in posterior `psi_g` and **NOT** in posterior `psi_b`
   * - if (validity === 1) then the work report must **NOT** be in posterior `psi_g` and in posterior `psi_b`
   * @see DisputesState.psi_b
   * @see DisputesState.psi_g
   */
  @hashCodec()
  target!: Hash;
  /**
   * the signaled validity of the work report
   */
  @booleanCodec()
  vote!: boolean;
  /**
   * the validator public key
   * This must be either in the current or prev set of validators
   * and it must not be inside DisputesState.psi_o
   * @see DisputesState.psi_o
   */
  @ed25519PubkeyCodec()
  key!: ED25519PublicKey;
  /**
   * payload should be $jam_valid + workReportHash or $jam_invalid + workReportHash
   */
  @ed25519SignatureCodec()
  signature!: ED25519Signature;
}
/**
 * codec order defined in $(0.7.1 - C.21)
 */
@JamCodecable()
export class DisputeExtrinsicImpl
  extends BaseJamCodecable
  implements DisputeExtrinsic
{
  /**
   * `V`
   * one ore more verdicts. They must be ordered by .hash
   */
  @lengthDiscriminatedCodec(DisputeVerdictImpl)
  verdicts!: MinSeqLength<DisputeVerdictImpl, 1>;
  /**
   * `EC`
   * validators that brought to chain the workreport saying it was valid by guarateeing for it
   * this means that each .hash here should reference a verdict with validity === 0
   * they must be ordered by .ed25519PublicKey
   *
   * There are 2x entried in the culprit array for each in verdicts
   * because when a verdict happen there are always 2 validators involved
   */
  @lengthDiscriminatedCodec(DisputeCulpritImpl, "culprits")
  culprits!: Array<DisputeCulpritImpl>;
  /**
   * `EF`
   * validators that brought to chain the workreport saying it was valid by guarateeing for it proofs of misbehaviour of one or more validators signing a judgement
   * in contraddiction with the workreport validity
   * they must be ordered by .ed25519PublicKey
   *
   * There is one entry in the faults array for each verdict containing only valid verdicts matching the workreport hash
   *
   */
  @lengthDiscriminatedCodec(DisputeFaultImpl)
  faults!: Array<DisputeFaultImpl>;

  /**
   * computes bold_v as $(0.7.1 - 10.11 / 10.12)
   * @returns undefined if votes are
   */
  verdictsVotes(
    this: Validated<DisputeExtrinsicImpl>,
  ): Array<{ reportHash: Hash; votes: VerdictVoteKind }>;
  verdictsVotes(
    this: DisputeExtrinsicImpl,
  ): Array<{ reportHash: Hash; votes: VerdictVoteKind | number }>;
  verdictsVotes() {
    const bold_v: Array<{
      reportHash: Hash;
      votes: VerdictVoteKind | number;
    }> = this.verdicts.map((verdict) => {
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
              : numericVotes === Math.floor(MINIMUM_VALIDATORS / 3)
                ? VerdictVoteKind.ONE_THIRD
                : numericVotes,
      };
    });
    return bold_v;
  }

  checkValidity(deps: {
    tau: TauImpl;
    kappa: JamStateImpl["kappa"];
    lambda: JamStateImpl["lambda"];
  }): Result<
    Validated<DisputeExtrinsicImpl>,
    DisputesExtrinsicValidationError
  > {
    // $(0.7.1 - 10.2)
    for (const v of this.verdicts) {
      if (
        v.age !== deps.tau.epochIndex() &&
        v.age !== deps.tau.epochIndex() - 1
      ) {
        return err(DisputesExtrinsicValidationError.EPOCH_INDEX_WRONG);
      }

      if (v.judgements.length !== MINIMUM_VALIDATORS) {
        return err(DisputesExtrinsicValidationError.JUDGEMENTS_LENGTH_WRONG);
      }
    }

    const bold_v = this.verdictsVotes();
    if (
      bold_v.some(
        (v) =>
          v.votes !== VerdictVoteKind.ZERO &&
          v.votes !== VerdictVoteKind.ONE_THIRD &&
          v.votes !== VerdictVoteKind.TWO_THIRD_PLUS_ONE,
      )
    ) {
      return err(DisputesExtrinsicValidationError.JUDGEMENTS_WRONG);
    }

    // verify all  verdics signatures
    // $(0.7.1 - 10.3)
    if (
      false ===
      this.verdicts.every((verdict) => {
        const validatorSet =
          verdict.age === deps.tau.epochIndex() ? deps.kappa : deps.lambda;
        return verdict.judgements.every((judgement) => {
          const validatorPubKey = validatorSet.at(judgement.index).ed25519;
          let message: Uint8Array;
          if (judgement.vote) {
            message = new Uint8Array([
              ...JAM_VALID,
              ...encodeWithCodec(HashCodec, verdict.target),
            ]);
          } else {
            message = new Uint8Array([
              ...JAM_INVALID,
              ...encodeWithCodec(HashCodec, verdict.target),
            ]);
          }
          const signatureVerified = Ed25519.verifySignature(
            judgement.signature,
            validatorPubKey,
            message,
          );
          if (!signatureVerified) {
            return false;
          }
          return true;
        });
      })
    ) {
      return err(DisputesExtrinsicValidationError.VERDICT_SIGNATURES_WRONG);
    }

    // NOTE: culprits and verdics are checked by disputesState
    return ok(toTagged(this));
  }
}

export enum VerdictVoteKind {
  ZERO,
  ONE_THIRD,
  TWO_THIRD_PLUS_ONE,
}

export enum DisputesExtrinsicValidationError {
  VERDICT_SIGNATURES_WRONG = "verdict-signatures-wrong",
  EPOCH_INDEX_WRONG = "epoch-index-wrong-in-verdicts",
  JUDGEMENTS_LENGTH_WRONG = "JUDGEMENTS_LENGTH_WRONG",
  JUDGEMENTS_WRONG = "JUDGEMENTS_WRONG",
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("codecEd", () => {
    it("disputes_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("disputes_extrinsic.bin");
      const { value: ed } = DisputeExtrinsicImpl.decode(bin);
      expect(Buffer.from(ed.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("disputes_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("disputes_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const ed: DisputeExtrinsicImpl = DisputeExtrinsicImpl.fromJSON(json);

      expect(ed.toJSON()).to.deep.eq(json);
    });
  });
}
