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
    reporters: Set<ED25519PublicKey["bigint"]>; // $(0.7.0 - 11.26) | G
  },
  never
> = (input, state) => {
  const pi_v = [...state[0].map((a) => ({ ...a }))] as ValidatorStatistics[0];
  const pi_l = [...state[1].map((a) => ({ ...a }))] as ValidatorStatistics[1];
  const p_pi_v: Posterior<ValidatorStatistics[0]> = <
    Posterior<ValidatorStatistics[0]>
  >new Array(NUMBER_OF_VALIDATORS);
  let p_pi_l: Posterior<ValidatorStatistics[1]>;

  // $(0.7.0 - 13.3 / 13.4)
  let bold_a = pi_v;
  p_pi_l = toPosterior(pi_l);
  if (isNewEra(input.p_tau, input.curTau)) {
    p_pi_l = toPosterior(pi_v);
    bold_a = new Array(NUMBER_OF_VALIDATORS).fill(0).map(() => {
      return {
        blocks: 0,
        tickets: 0,
        preimageCount: 0,
        preimageSize: 0,
        guarantees: 0,
        assurances: 0,
      };
    }) as unknown as SeqOfLength<
      SingleValidatorStatistics,
      typeof NUMBER_OF_VALIDATORS
    >;
  }

  for (let v = 0; v < NUMBER_OF_VALIDATORS; v++) {
    const curV = v === input.authorIndex;
    // $(0.7.0 - 13.5)
    p_pi_v[v] = {
      blocks: <u32>(bold_a[v].blocks + (curV ? 1 : 0)),
      tickets: <u32>(
        (bold_a[v].tickets + (curV ? input.extrinsics.tickets.length : 0))
      ),
      preimageCount: <u32>(
        (bold_a[v].preimageCount +
          (curV ? input.extrinsics.preimages.length : 0))
      ),
      preimageSize: <u32>(
        (bold_a[v].preimageSize +
          (curV
            ? input.extrinsics.preimages.reduce(
                (acc, a) => acc + a.preimage.length,
                0,
              )
            : 0))
      ),
      guarantees: <u32>(
        (bold_a[v].guarantees +
          (input.reporters.has(input.p_kappa[v].ed25519.bigint) ? 1 : 0))
      ),
      assurances: <u32>(
        (bold_a[v].assurances +
          input.extrinsics.assurances.filter((a) => a.validatorIndex === v)
            .length)
      ),
    };
  }

  return ok([p_pi_v, p_pi_l] as unknown as Posterior<ValidatorStatistics>);
};
