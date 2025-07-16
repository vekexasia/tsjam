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
  MINIMUM_VALIDATORS,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import { err, ok } from "neverthrow";

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

/**
 * Computes state transition for disputes state
 * $(0.6.4 - 4.11)
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
  const kappaULambdaNoOffenders = new Set([
    ...input.kappa.map((v) => v.ed25519.bigint),
    ...input.lambda.map((v) => v.ed25519.bigint),
  ]);

  // remove offenders
  curState.offenders.forEach((offender) =>
    kappaULambdaNoOffenders.delete(offender),
  );

  // check culprit key is in lambda or kappa
  // $(0.7.0 - 10.5) - partial
  const checkCulpritKeys = input.extrinsic.culprit.every(
    ({ ed25519PublicKey }) =>
      kappaULambdaNoOffenders.has(ed25519PublicKey.bigint),
  );
  if (!checkCulpritKeys) {
    return err(DisputesToPosteriorError.CULPRITKEYNOTINK);
  }

  // check faults key is in lambda or kappa
  // $(0.7.0 - 10.6) - partial
  const checkFaultKeys = input.extrinsic.faults.every(({ ed25519PublicKey }) =>
    kappaULambdaNoOffenders.has(ed25519PublicKey.bigint),
  );
  if (!checkFaultKeys) {
    return err(DisputesToPosteriorError.FAULTKEYNOTINK);
  }

  // check culprit signature is valid
  // $(0.7.0 - 10.5) - partial
  const _checkculprit = input.extrinsic.culprit.map((culprit) => {
    const verified = Ed25519.verifySignature(
      culprit.signature,
      culprit.ed25519PublicKey,
      new Uint8Array([...JAM_GUARANTEE, ...bigintToBytes(culprit.hash, 32)]),
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
  // $(0.7.0 - 10.6) - partial
  const _checkfaults = input.extrinsic.faults.map((fault) => {
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
  // $(0.7.0 - 10.7)
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
  }

  // enforce culprit are ordered by ed25519PublicKey
  // $(0.7.0 - 10.8)
  if (input.extrinsic.culprit.length > 0) {
    for (let i = 1; i < input.extrinsic.culprit.length; i++) {
      const [prev, curr] = [
        input.extrinsic.culprit[i - 1],
        input.extrinsic.culprit[i],
      ];
      if (prev.ed25519PublicKey.bigint >= curr.ed25519PublicKey.bigint) {
        return err(
          DisputesToPosteriorError.CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
        );
      }
    }
  }

  // enforce faults are ordered by ed25519PublicKey
  // $(0.7.0 - 10.8)
  if (input.extrinsic.faults.length > 0) {
    for (let i = 1; i < input.extrinsic.faults.length; i++) {
      const [prev, curr] = [
        input.extrinsic.faults[i - 1],
        input.extrinsic.faults[i],
      ];
      if (prev.ed25519PublicKey.bigint >= curr.ed25519PublicKey.bigint) {
        return err(
          DisputesToPosteriorError.FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
        );
      }
    }
  }

  // ensure verdict report hashes are not in psi_g or psi_b or psi_w
  // aka not in the set of work reports that were judged to be valid, bad or wonky already
  // $(0.7.0 - 10.9)
  for (const verdict of input.extrinsic.verdicts) {
    if (curState.good.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_G);
    }
    if (curState.bad.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_B);
    }
    if (curState.wonky.has(verdict.hash)) {
      return err(DisputesToPosteriorError.VERDICTS_IN_PSI_W);
    }
  }

  // ensure judgements are ordered by validatorIndex and no duplicates
  // $(0.7.0 - 10.10)
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
  const bold_v = verdictsVotes(input.extrinsic.verdicts);
  if (
    false ===
    bold_v.every((v) => {
      switch (v.votes) {
        case 0:
        case NUMBER_OF_VALIDATORS / 3:
        case MINIMUM_VALIDATORS:
          return true;
        default:
          return false;
      }
    })
  ) {
    return err(DisputesToPosteriorError.VERDICTS_NUM_VALIDATORS);
  }

  const negativeVerdicts = bold_v.filter((v) => v.votes === 0);
  const positiveVerdicts = bold_v.filter((v) => v.votes === MINIMUM_VALIDATORS);

  // ensure any positive verdicts are in faults
  // $(0.7.0 - 10.13)
  if (
    false ===
    positiveVerdicts.every(
      (v) => !input.extrinsic.faults.some((f) => f.hash === v.reportHash),
    )
  ) {
    return err(DisputesToPosteriorError.POSITIVE_VERDICTS_NOT_IN_FAULTS);
  }

  // ensure any negative verdicts have at least 2 in cuprit
  // $(0.7.0 - 10.14)
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

  const p_state = {
    // $(0.7.0 - 10.16)
    good: new Set([
      ...curState.good,
      ...bold_v
        .filter(({ votes }) => votes == (NUMBER_OF_VALIDATORS * 2) / 3 + 1)
        .map(({ reportHash }) => reportHash),
    ]),

    // $(0.7.0 - 10.17)
    bad: new Set([
      ...curState.bad,
      ...bold_v
        .filter(({ votes }) => votes == 0)
        .map(({ reportHash }) => reportHash),
    ]),

    // $(0.7.0 - 10.18)
    wonky: new Set([
      ...curState.wonky,
      ...bold_v
        .filter(({ votes }) => votes == NUMBER_OF_VALIDATORS / 3)
        .map(({ reportHash }) => reportHash),
    ]),

    // $(0.7.0 - 10.19)
    offenders: new Set([
      ...curState.offenders,
      ...input.extrinsic.culprit.map(
        ({ ed25519PublicKey }) => ed25519PublicKey,
      ),
      ...input.extrinsic.faults.map(({ ed25519PublicKey }) => ed25519PublicKey),
    ]),
  } as Posterior<IDisputesState>;

  // $(0.7.0 - 10.5) - end
  // culprit `r` should be in psi_b'
  for (let i = 0; i < input.extrinsic.culprit.length; i++) {
    const { hash } = input.extrinsic.culprit[i];
    if (!p_state.bad.has(hash)) {
      return err(DisputesToPosteriorError.CULPRIT_NOT_IN_PSIB);
    }
  }

  // perform some other last checks
  // $(0.7.0 - 10.6) - end
  // faults reports should be in psi_b' or psi_g'
  for (let i = 0; i < input.extrinsic.faults.length; i++) {
    const { hash, validity } = input.extrinsic.faults[i];
    if (validity == 1) {
      if (!(p_state.bad.has(hash) && !p_state.good.has(hash))) {
        return err(
          DisputesToPosteriorError.VALID_REPORT_NOT_IN_PSIB_OR_IN_PSIO,
        );
      }
    } else {
      if (!(!p_state.bad.has(hash) && p_state.good.has(hash))) {
        return err(
          DisputesToPosteriorError.INVALID_REPORT_IN_PSIB_OR_NOT_IN_PSIO,
        );
      }
    }
  }

  return ok(p_state);
};

/**
 * computes bold_v as per
 * $(0.7.0 - 10.11 / 10.12)
 */
export const verdictsVotes = (
  verdicts: DisputeExtrinsic["verdicts"],
): Array<{ reportHash: Hash; votes: number }> => {
  const bold_v: Array<{ reportHash: Hash; votes: number }> = verdicts.map(
    (verdict) => {
      return {
        reportHash: verdict.hash,
        votes: verdict.judgements.reduce((acc, curr) => acc + curr.validity, 0),
      };
    },
  );
  return bold_v;
};
