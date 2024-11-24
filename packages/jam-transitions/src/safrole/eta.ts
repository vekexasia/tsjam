import { JamEntropy, JamHeader, Posterior, STF, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * rotate `η`
 * $(0.5.0 - 6.22 / 6.23)
 */
export const rotateEntropy: STF<
  JamEntropy,
  {
    tau: Tau;
    p_tau: Posterior<Tau>;
    h_v: JamHeader["entropySignature"];
  },
  never
> = (input, eta) => {
  const vrfOut = Bandersnatch.vrfOutputSignature(input.h_v);
  const p_eta0 = Hashing.blake2b(
    new Uint8Array([
      ...bigintToBytes(eta[0], 32),
      ...bigintToBytes(vrfOut, 32),
    ]),
  );
  if (isNewEra(input.p_tau, input.tau)) {
    return ok([p_eta0, eta[0], eta[1], eta[2]] as Posterior<JamEntropy>);
  }
  return ok([p_eta0, ...eta.slice(1)] as Posterior<JamEntropy>);
};
