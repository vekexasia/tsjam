import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  BandersnatchKey,
  Posterior,
  SeqOfLength,
  ValidatorData,
} from "@tsjam/types";
import { TicketImpl } from "./classes/TicketImpl";
import { DisputesStateImpl } from "./classes/DisputesStateImpl";
import { toTagged } from "@tsjam/utils";

/**
 * Z fn
 * exported cause it's being used to check/produce `Hw` in Header
 * $(0.7.0 - 6.25)
 */
export const outsideInSequencer = <
  T extends SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>,
>(
  t: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>,
): T => {
  const toRet: T = [] as unknown as T;
  for (let i = 0; i < EPOCH_LENGTH / 2; i++) {
    toRet.push(t[i]);
    toRet.push(t[EPOCH_LENGTH - i - 1]);
  }
  return toRet;
};

/**
 * Phi function
 * returns the validator keys which are not in ψo. nullify the validator keys which are in ψ'o
 * @see $(0.7.0 - 6.14)
 */
export const PHI_FN = <T extends ValidatorData[]>(
  validatorKeys: ValidatorData[], // `k` in the graypaper
  p_offenders: Posterior<DisputesStateImpl["offenders"]>,
): T => {
  return validatorKeys.map((v) => {
    if (p_offenders.has(v.ed25519.bigint)) {
      return {
        banderSnatch: new Uint8Array(32).fill(0) as BandersnatchKey,
        ed25519: {
          buf: new Uint8Array(32).fill(0) as ValidatorData["ed25519"]["buf"],
          bigint: toTagged(0n),
        },
        blsKey: new Uint8Array(144).fill(0) as ValidatorData["blsKey"],
        metadata: new Uint8Array(128).fill(0) as ValidatorData["metadata"],
      };
    }
    return v;
  }) as T;
};
