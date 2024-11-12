import { isNewEra } from "@tsjam/utils";
import {
  JamBlock,
  Posterior,
  STF,
  SafroleState,
  SeqOfLength,
  SingleValidatorStatistics,
  Tau,
  ValidatorStatistics,
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
    block: JamBlock;
    safrole: SafroleState;
    curTau: Tau;
  },
  never
> = (input, state) => {
  let pi_0 = [...state[0]] as ValidatorStatistics[0];
  // (171)
  if (isNewEra(input.block.header.timeSlotIndex, input.curTau)) {
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

  // todo: graypaper says we should compute R and test k'_v over it but i think it's just because R contaqins ed2559 keys
  // and not indexes
  const reporterSet = new Set(
    input.block.extrinsics.reportGuarantees
      .map((a) => {
        return a.credential.map((c) => c.validatorIndex);
      })
      .flat(),
  );

  for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
    const curV = i === input.block.header.blockAuthorKeyIndex;
    pi_0[i] = {
      blocksProduced: pi_0[i].blocksProduced + (curV ? 1 : 0),
      ticketsIntroduced:
        pi_0[i].ticketsIntroduced +
        (curV ? input.block.extrinsics.tickets.length : 0),
      preimagesIntroduced:
        pi_0[i].preimagesIntroduced +
        (curV ? input.block.extrinsics.preimages.length : 0),
      totalOctetsIntroduced:
        pi_0[i].totalOctetsIntroduced +
        (curV
          ? input.block.extrinsics.preimages.reduce(
              (acc, a) => acc + a.preimage.length,
              0,
            )
          : 0),
      guaranteedReports:
        pi_0[i].guaranteedReports +
        (reporterSet.has(input.block.header.blockAuthorKeyIndex) ? 1 : 0),
      availabilityAssurances:
        pi_0[i].availabilityAssurances +
        input.block.extrinsics.assurances.filter((a) => a.validatorIndex === i)
          .length,
    };
  }

  return ok([pi_0, state[1]] as unknown as Posterior<ValidatorStatistics>);
};
