import { JamEntropy, JamHeader, Posterior, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra, newSTF, toTagged } from "@tsjam/utils";

/**
 * `η0`
 * We Hash cur eta0 with vrf
 * @see (67) - 0.4.5
 */
export const eta0STF = newSTF<JamEntropy[0], JamHeader["entropySignature"]>(
  (
    entropySignature: JamHeader["entropySignature"],
    curState: JamEntropy[0],
  ): Posterior<JamEntropy[0]> => {
    const vrfOut = Bandersnatch.vrfOutputSignature(entropySignature);
    return toTagged(
      Hashing.blake2b(
        new Uint8Array([
          ...bigintToBytes(curState, 32),
          ...bigintToBytes(vrfOut, 32),
        ]),
      ),
    );
  },
);

/**
 * Rotate from `n1` to `n3`
 * @see (68) - 0.4.5
 */
export const entropyRotationSTF = newSTF<
  JamEntropy,
  { tau: Tau; p_tau: Posterior<Tau> }
>(
  (
    input: { tau: Tau; p_tau: Posterior<Tau> },
    eta: JamEntropy,
  ): Posterior<JamEntropy> => {
    if (isNewEra(input.p_tau, input.tau)) {
      return [eta[0], eta[0], eta[1], eta[2]] as Posterior<JamEntropy>;
    }
    return eta as Posterior<JamEntropy>;
  },
);
