import { JamEntropy, Posterior, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra, newSTF, toTagged } from "@tsjam/utils";

export const eta0STF = newSTF<
  JamEntropy[0],
  ReturnType<typeof Bandersnatch.vrfOutputSignature>
>(
  (
    input: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
    curState: JamEntropy[0],
  ): Posterior<JamEntropy[0]> => {
    return toTagged(
      Hashing.blake2b(
        new Uint8Array([
          ...bigintToBytes(curState, 32),
          ...bigintToBytes(input, 32),
        ]),
      ),
    );
  },
);

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
