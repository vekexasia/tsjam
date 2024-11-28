import { bigintToBytes, epochIndex } from "@tsjam/utils";
import {
  DisputeExtrinsic,
  Hash,
  IDisputesState,
  JamState,
  Posterior,
  STF,
  Tau,
} from "@tsjam/types";
import {
  JAM_GUARANTEE,
  JAM_INVALID,
  JAM_VALID,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import { err, ok } from "neverthrow";

export enum DisputesToPosteriorError {
  EPOCH_INDEX_WRONG = "epochIndex is wrong",
  ED25519_PUBLIC_KEY_MUST_NOT_BE_IN_PSI = "culprit.ed25519PublicKey must not be in psi_o",
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
}

/**
 * Computes state transition for disputes state
 * $(0.5.0 - 4.12)
 */
export const disputesSTF: STF<
  IDisputesState,
  {
    kappa: JamState["kappa"];
    lambda: JamState["lambda"];
    extrinsic: DisputeExtrinsic;
    curTau: Tau;
  },
  DisputesToPosteriorError
> = (input, curState) => {
  // $(0.5.0 - 10.2)
  for (const v of input.extrinsic.verdicts) {
    if (
      v.epochIndex !== epochIndex(input.curTau) &&
      v.epochIndex !== epochIndex(input.curTau) - 1
    ) {
      return err(DisputesToPosteriorError.EPOCH_INDEX_WRONG);
    }

    if (v.judgements.length !== Math.floor(2 * NUMBER_OF_VALIDATORS) / 3 + 1) {
      return err(DisputesToPosteriorError.VERDICTS_NUM_VALIDATORS);
    }
  }

  // enforce culprit keys are not in psi_o and signture is valid
  // $(0.5.0 - 10.5)
  const _checkculprit = input.extrinsic.culprit.map((culprit) => {
    if (curState.psi_o.has(culprit.ed25519PublicKey)) {
      return err(
        DisputesToPosteriorError.ED25519_PUBLIC_KEY_MUST_NOT_BE_IN_PSI,
      );
    }
    const verified = Ed25519.verifySignature(
      culprit.signature,
      culprit.ed25519PublicKey,
      new Uint8Array([...JAM_GUARANTEE, ...bigintToBytes(culprit.hash, 32)]),
    );
    if (!verified) {
      return err(DisputesToPosteriorError.CUPLRIT_SIGNATURE_INVALID);
    }
    // each culprit should reference a verdict
    if (!input.extrinsic.verdicts.some((v) => v.hash === culprit.hash)) {
      return err(DisputesToPosteriorError.CULPRIT_HASH_MUST_REFERENCE_VERDICT);
    }
    return ok(null as unknown as Posterior<IDisputesState>);
  });
  if (_checkculprit.some((res) => res.isErr())) {
    return _checkculprit.find((res) => res.isErr())!;
  }

  // enforce faults keys are not in psi_o and signature is valid
  // $(0.5.0 - 10.6)
  const _checkfaults = input.extrinsic.faults.map((fault) => {
    if (curState.psi_o.has(fault.ed25519PublicKey)) {
      return err(
        DisputesToPosteriorError.ED25519_PUBLIC_KEY_MUST_NOT_BE_IN_PSI,
      );
    }
    const verified = Ed25519.verifySignature(
      fault.signature,
      fault.ed25519PublicKey,
      new Uint8Array([
        ...(fault.validity === 1 ? JAM_VALID : JAM_INVALID),
        ...bigintToBytes(fault.hash, 32),
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
  // $(0.5.0 - 10.7)
  const currentEpoch = epochIndex(input.curTau);
  if (
    input.extrinsic.verdicts.length > 0 &&
    input.extrinsic.verdicts[0].epochIndex < currentEpoch - 1
  ) {
    return err(DisputesToPosteriorError.VERDICTS_NOT_FROM_CURRENT_EPOCH);
  }
  for (let i = 1; i < input.extrinsic.verdicts.length; i++) {
    const [prev, curr] = [
      input.extrinsic.verdicts[i - 1],
      input.extrinsic.verdicts[i],
    ];
    if (prev.hash >= curr.hash) {
      return err(
        DisputesToPosteriorError.VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH,
      );
    }
    if (curr.epochIndex < currentEpoch - 1) {
      return err(DisputesToPosteriorError.VERDICTS_NOT_FROM_CURRENT_EPOCH);
    }
  }

  // enforce culprit are ordered by ed25519PublicKey
  // $(0.5.0 - 10.8)
  if (input.extrinsic.culprit.length > 0) {
    for (let i = 1; i < input.extrinsic.culprit.length; i++) {
      const [prev, curr] = [
        input.extrinsic.culprit[i - 1],
        input.extrinsic.culprit[i],
      ];
      if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
        return err(
          DisputesToPosteriorError.CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
        );
      }
    }
  }

  // enforce faults are ordered by ed25519PublicKey
  // $(0.5.0 - 10.8)
  if (input.extrinsic.faults.length > 0) {
    for (let i = 1; i < input.extrinsic.faults.length; i++) {
      const [prev, curr] = [
        input.extrinsic.faults[i - 1],
        input.extrinsic.faults[i],
      ];
      if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
        return err(
          DisputesToPosteriorError.FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
        );
      }
    }
  }

  // ensure verdict report hashes are not in psi_g or psi_b or psi_w
  // aka not in the set of work reports that were judged to be valid, bad or wonky already
  // $(0.5.0 - 10.9)
  for (const verdict of input.extrinsic.verdicts) {
    if (curState.psi_g.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_G);
    }
    if (curState.psi_b.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_B);
    }
    if (curState.psi_w.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_W);
    }
  }

  // ensure judgements are ordered by validatorIndex
  // $(0.5.0 - 10.10)
  if (
    false ===
    input.extrinsic.verdicts.every((verdict) => {
      for (let i = 1; i < verdict.judgements.length; i++) {
        if (
          verdict.judgements[i - 1].validatorIndex >=
          verdict.judgements[i].validatorIndex
        ) {
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

  // ensure that judgements are either 0 or 1/3 NUM_VALIDATORS or 2/3+1 of NUM_VALIDATORS
  // $(0.5.0 - 10.11 / 10.12)
  // first compute `V`
  const V: Array<{ reportHash: Hash; votes: number }> =
    input.extrinsic.verdicts.map((verdict) => {
      return {
        reportHash: verdict.hash,
        votes: verdict.judgements.reduce((acc, curr) => acc + curr.validity, 0),
      };
    });
  if (
    !V.every((v) => {
      switch (v.votes) {
        case 0:
        case NUMBER_OF_VALIDATORS / 3:
        case (2 * NUMBER_OF_VALIDATORS) / 3 + 1:
          return true;
        default:
          return false;
      }
    })
  ) {
    return err(DisputesToPosteriorError.VERDICTS_NUM_VALIDATORS);
  }

  const negativeVerdicts = V.filter((v) => v.votes === 0);
  const positiveVerdicts = V.filter(
    (v) => v.votes === (2 * NUMBER_OF_VALIDATORS) / 3 + 1,
  );

  // ensure any positive verdicts are in faults
  // $(0.5.0 - 10.13)
  if (
    false ===
    positiveVerdicts.every((v) => {
      if (!input.extrinsic.faults.some((f) => f.hash === v.reportHash)) {
        return false;
      }
      return true;
    })
  ) {
    return err(DisputesToPosteriorError.POSITIVE_VERDICTS_NOT_IN_FAULTS);
  }

  // ensure any negative verdicts have at least 2 in cuprit
  // $(0.5.0 - 10.14)
  if (
    false ===
    negativeVerdicts.every((v) => {
      if (
        input.extrinsic.culprit.filter((c) => c.hash === v.reportHash).length <
        2
      ) {
        return false;
      }
      return true;
    })
  ) {
    return err(DisputesToPosteriorError.NEGATIVE_VERDICTS_NOT_IN_CULPRIT);
  }

  // verify all signatures
  // $(0.5.0 - 10.3)
  if (
    false ===
    input.extrinsic.verdicts.every((verdict) => {
      const validatorSet =
        verdict.epochIndex === epochIndex(input.curTau)
          ? input.kappa
          : input.lambda;
      return verdict.judgements.every((judgement) => {
        const validatorPubKey = validatorSet[judgement.validatorIndex].ed25519;
        let message: Uint8Array;
        if (judgement.validity === 1) {
          message = new Uint8Array([
            ...JAM_VALID,
            ...bigintToBytes(verdict.hash, 32),
          ]);
        } else {
          message = new Uint8Array([
            ...JAM_INVALID,
            ...bigintToBytes(verdict.hash, 32),
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
    return err(DisputesToPosteriorError.VERDICT_SIGNATURE_INVALID);
  }

  const p_state = {
    // $(0.5.0 - 10.16)
    psi_g: new Set([
      ...curState.psi_g,
      ...V.filter(
        ({ votes }) => votes == (NUMBER_OF_VALIDATORS * 2) / 3 + 1,
      ).map(({ reportHash }) => reportHash),
    ]),

    // $(0.5.0 - 10.17)
    psi_b: new Set([
      ...curState.psi_b,
      ...V.filter(({ votes }) => votes == 0).map(
        ({ reportHash }) => reportHash,
      ),
    ]),

    // $(0.5.0 - 10.18)
    psi_w: new Set([
      ...curState.psi_w,
      ...V.filter(({ votes }) => votes == NUMBER_OF_VALIDATORS / 3).map(
        ({ reportHash }) => reportHash,
      ),
    ]),

    // $(0.5.0 - 10.19)
    psi_o: new Set([
      ...curState.psi_o,
      ...input.extrinsic.culprit.map(
        ({ ed25519PublicKey }) => ed25519PublicKey,
      ),
      ...input.extrinsic.faults.map(({ ed25519PublicKey }) => ed25519PublicKey),
    ]),
  } as Posterior<IDisputesState>;

  // perform some other last checks
  // $(0.5.0 - 10.6) of the graypaper states that faults reports should be in psi_b' if `r`
  for (let i = 0; i < input.extrinsic.faults.length; i++) {
    const { hash, validity } = input.extrinsic.faults[i];
    if (validity == 1) {
      if (!(p_state.psi_b.has(hash) && !p_state.psi_g.has(hash))) {
        return err(
          DisputesToPosteriorError.VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO,
        );
      }
    } else {
      if (!(!p_state.psi_b.has(hash) && p_state.psi_g.has(hash))) {
        return err(
          DisputesToPosteriorError.INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO,
        );
      }
    }
  }

  // $(0.5.0 - 10.5)
  for (let i = 0; i < input.extrinsic.culprit.length; i++) {
    const { hash } = input.extrinsic.culprit[i];
    if (!p_state.psi_b.has(hash)) {
      return err(DisputesToPosteriorError.CULPRIT_NOT_IN_PSIB);
    }
  }

  return ok(p_state);
};
