import { JamEntropy, Posterior, STF, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * Rotate from `n1` to `n3`
 * @see (67) and (68) - 0.4.5
 */
export const rotateEntropy: STF<
  JamEntropy,
  {
    tau: Tau;
    p_tau: Posterior<Tau>;
    vrfOut: ReturnType<typeof Bandersnatch.vrfOutputSignature>;
  },
  never
> = (input, eta) => {
  // const vrfOut = Bandersnatch.vrfOutputSignature(input.entropySignature);
  const p_eta0 = Hashing.blake2b(
    new Uint8Array([
      ...bigintToBytes(eta[0], 32),
      ...bigintToBytes(input.vrfOut, 32),
    ]),
  );
  if (isNewEra(input.p_tau, input.tau)) {
    return ok([p_eta0, eta[0], eta[1], eta[2]] as Posterior<JamEntropy>);
  }
  return ok([p_eta0, ...eta.slice(1)] as Posterior<JamEntropy>);
};
