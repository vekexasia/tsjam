import { JamEntropy, JamHeader, Posterior, STF, Tau } from "@tsjam/types";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { bigintToBytes, isNewEra, toPosterior } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * rotate `η`
 * $(0.5.3 - 4.9)
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
  const [, p_eta0] = rotateEta0({ h_v: input.h_v }, eta[0]).safeRet();
  const [, [p_eta1, p_eta2, p_eta3]] = rotateEta1_4(
    {
      eta0: eta[0],
      p_tau: input.p_tau,
      tau: input.tau,
    },
    [eta[1], eta[2], eta[3]],
  ).safeRet();
  return ok(toPosterior([p_eta0, p_eta1, p_eta2, p_eta3] as JamEntropy));
};

/**
 * $(0.5.3 - 6.22)
 */
export const rotateEta0: STF<
  JamEntropy[0],
  { h_v: JamHeader["entropySignature"] },
  never
> = (input, eta0) => {
  const vrfOut = Bandersnatch.vrfOutputSignature(input.h_v);
  const p_eta0 = Hashing.blake2b(
    new Uint8Array([...bigintToBytes(eta0, 32), ...bigintToBytes(vrfOut, 32)]),
  );
  return ok(toPosterior(p_eta0));
};

/**
 * $(0.5.3 - 6.23)
 */
export const rotateEta1_4: STF<
  [JamEntropy[1], JamEntropy[2], JamEntropy[3]],
  { eta0: JamEntropy[0]; tau: Tau; p_tau: Posterior<Tau> },
  never
> = (input, [eta1, eta2, eta3]) => {
  if (isNewEra(input.p_tau, input.tau)) {
    return ok(toPosterior([input.eta0, eta1, eta2]));
  }
  return ok(toPosterior([eta1, eta2, eta3]));
};
