import { JamEntropy, JamHeader, Posterior, STF, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra, toPosterior, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * `η0`
 * We Hash cur eta0 with vrf
 * @see (67) - 0.4.5
 */
export const eta0STF: STF<
  JamEntropy[0],
  JamHeader["entropySignature"],
  never
> = (entropySignature, curState) => {
  const vrfOut = Bandersnatch.vrfOutputSignature(entropySignature);
  return ok(
    toPosterior(
      Hashing.blake2b(
        new Uint8Array([
          ...bigintToBytes(curState, 32),
          ...bigintToBytes(vrfOut, 32),
        ]),
      ),
    ),
  );
};

/**
 * Rotate from `n1` to `n3`
 * @see (68) - 0.4.5
 */
export const entropyRotationSTF: STF<
  JamEntropy,
  { tau: Tau; p_tau: Posterior<Tau> },
  never
> = (input, eta) => {
  if (isNewEra(input.p_tau, input.tau)) {
    return ok([eta[0], eta[0], eta[1], eta[2]] as Posterior<JamEntropy>);
  }
  return ok(eta as Posterior<JamEntropy>);
};
