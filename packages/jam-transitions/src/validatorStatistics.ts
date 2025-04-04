import { isNewEra, toPosterior } from "@tsjam/utils";
import {
  ED25519PublicKey,
  JamBlockExtrinsics,
  JamHeader,
  JamState,
  Posterior,
  STF,
  SeqOfLength,
  SingleValidatorStatistics,
  Tau,
  ValidatorStatistics,
  u32,
} from "@tsjam/types";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * computes the posterior validator statistics as depicted in
 * section 13
 */
export const validatorStatisticsToPosterior: STF<
  ValidatorStatistics,
  {
    extrinsics: JamBlockExtrinsics;
    authorIndex: JamHeader["blockAuthorKeyIndex"];
    curTau: Tau;
    p_tau: Tau;
    p_kappa: Posterior<JamState["kappa"]>;
    reporters: Set<ED25519PublicKey>; // $(0.6.1 - 11.26) | R
  },
  never
> = (input, state) => {
  const pi_v = [...state[0].map((a) => ({ ...a }))] as ValidatorStatistics[0];
  const pi_l = [...state[1].map((a) => ({ ...a }))] as ValidatorStatistics[1];
  const p_pi_v: Posterior<ValidatorStatistics[0]> = <
    Posterior<ValidatorStatistics[0]>
  >new Array(NUMBER_OF_VALIDATORS);
  let p_pi_l: Posterior<ValidatorStatistics[1]>;
  let bold_a = pi_v;
  p_pi_l = toPosterior(pi_l);

  // $(0.6.4 - 13.3)
  if (isNewEra(input.p_tau, input.curTau)) {
    // $(0.6.4 - 13.4) | second bracket
    p_pi_l = toPosterior(pi_v);
    bold_a = new Array(NUMBER_OF_VALIDATORS).fill(0).map(() => {
      return {
        blocksProduced: 0,
        ticketsIntroduced: 0,
        preimagesIntroduced: 0,
        totalOctetsIntroduced: 0,
        guaranteedReports: 0,
        availabilityAssurances: 0,
      };
    }) as unknown as SeqOfLength<
      SingleValidatorStatistics,
      typeof NUMBER_OF_VALIDATORS
    >;
  }

  for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
    const curV = i === input.authorIndex;
    // $(0.6.4 - 13.5)
    p_pi_v[i] = {
      blocksProduced: <u32>(bold_a[i].blocksProduced + (curV ? 1 : 0)),
      ticketsIntroduced: <u32>(
        (bold_a[i].ticketsIntroduced +
          (curV ? input.extrinsics.tickets.length : 0))
      ),
      preimagesIntroduced: <u32>(
        (bold_a[i].preimagesIntroduced +
          (curV ? input.extrinsics.preimages.length : 0))
      ),
      totalOctetsIntroduced: <u32>(
        (bold_a[i].totalOctetsIntroduced +
          (curV
            ? input.extrinsics.preimages.reduce(
                (acc, a) => acc + a.preimage.length,
                0,
              )
            : 0))
      ),
      guaranteedReports: <u32>(
        (bold_a[i].guaranteedReports +
          (input.reporters.has(input.p_kappa[i].ed25519) ? 1 : 0))
      ),
      availabilityAssurances: <u32>(
        (bold_a[i].availabilityAssurances +
          input.extrinsics.assurances.filter((a) => a.validatorIndex === i)
            .length)
      ),
    };
  }

  return ok([p_pi_v, p_pi_l] as unknown as Posterior<ValidatorStatistics>);
};
