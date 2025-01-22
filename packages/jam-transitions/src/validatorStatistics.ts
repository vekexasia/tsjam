import { isNewEra } from "@tsjam/utils";
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
    reporters: Set<ED25519PublicKey>; // $(0.5.4 - 11.26) | R
  },
  never
> = (input, state) => {
  let pi_0 = [...state[0].map((a) => ({ ...a }))] as ValidatorStatistics[0];
  let pi_1 = [...state[1].map((a) => ({ ...a }))] as ValidatorStatistics[0];

  // $(0.5.4 - 13.2)
  if (isNewEra(input.p_tau, input.curTau)) {
    // $(0.5.4 - 13.3) | second bracket
    pi_1 = pi_0;
    pi_0 = new Array(NUMBER_OF_VALIDATORS).fill(0).map(() => {
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
    // $(0.5.4 - 13.4)
    pi_0[i] = {
      blocksProduced: <u32>(pi_0[i].blocksProduced + (curV ? 1 : 0)),
      ticketsIntroduced: <u32>(
        (pi_0[i].ticketsIntroduced +
          (curV ? input.extrinsics.tickets.length : 0))
      ),
      preimagesIntroduced: <u32>(
        (pi_0[i].preimagesIntroduced +
          (curV ? input.extrinsics.preimages.length : 0))
      ),
      totalOctetsIntroduced: <u32>(
        (pi_0[i].totalOctetsIntroduced +
          (curV
            ? input.extrinsics.preimages.reduce(
                (acc, a) => acc + a.preimage.length,
                0,
              )
            : 0))
      ),
      guaranteedReports: <u32>(
        (pi_0[i].guaranteedReports +
          (input.reporters.has(input.p_kappa[i].ed25519) ? 1 : 0))
      ),
      availabilityAssurances: <u32>(
        (pi_0[i].availabilityAssurances +
          input.extrinsics.assurances.filter((a) => a.validatorIndex === i)
            .length)
      ),
    };
  }

  return ok([pi_0, pi_1] as unknown as Posterior<ValidatorStatistics>);
};
