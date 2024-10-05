import { slotIndex, toPosterior } from "@tsjam/utils";
import {
  EG_Extrinsic,
  G_Star,
  GuarantorsAssignment,
  Hash,
  IDisputesState,
  Posterior,
  SafroleState,
  Tau,
  Validated,
  u32,
} from "@tsjam/types";
import assert from "node:assert";
import {
  CORES,
  JAM_GUARANTEE,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
} from "@tsjam/constants";
import { WorkReportCodec, encodeWithCodec } from "@tsjam/codec";
import { Ed25519, Hashing } from "@tsjam/crypto";
import { FisherYatesH } from "@tsjam/crypto";
import { PHI_FN } from "@tsjam/transitions";

export const assertEGValid = (
  extrinsic: EG_Extrinsic,
  deps: {
    p_eta: Posterior<SafroleState["eta"]>;
    kappa: SafroleState["kappa"];
    p_kappa: Posterior<SafroleState["kappa"]>;
    p_lambda: Posterior<SafroleState["lambda"]>;
    p_tau: Posterior<Tau>;
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
  },
): Validated<EG_Extrinsic> => {
  if (extrinsic.length === 0) {
    return extrinsic as Validated<EG_Extrinsic>; // optimization
  }
  // (136)
  assert(extrinsic.length <= CORES, "Extrinsic length must be less than CORES");

  // (137) - make sure they're ordered and uniqueby coreindex
  extrinsic.reduce((acc, next) => {
    assert(
      next.workReport.coreIndex > acc.workReport.coreIndex,
      "core index must be unique and ordered",
    );
    assert(
      next.workReport.coreIndex < CORES && next.workReport.coreIndex >= 0,
      "core index not in bounds",
    );
    return next;
  });

  extrinsic.forEach((ext) => {
    // 136
    assert(
      ext.credential.length >= 2 && ext.credential.length <= 3,
      "credential length must be between 2 and 3",
    );
    ext.credential.forEach((cred) => {
      assert(
        cred.validatorIndex >= 0 || cred.validatorIndex < NUMBER_OF_VALIDATORS,
        "validator index must be 0 <= x < V",
      );
    });
    // 138
    ext.credential.reduce((prev, next) => {
      assert(
        next.validatorIndex > prev.validatorIndex,
        "validator index must be unique and ordered",
      );
      return next;
    });

    const { workReport, credential } = ext;
    // check signature (139)
    const wrh = Hashing.blake2bBuf(
      encodeWithCodec(WorkReportCodec, workReport),
    );

    const messageToSign = new Uint8Array([...JAM_GUARANTEE, ...wrh]);

    credential.forEach(({ signature, validatorIndex }) => {
      const isValid = Ed25519.verifySignature(
        signature,
        deps.kappa[validatorIndex].ed25519,
        messageToSign,
      );
      assert(isValid, "EG signature is invalid");
    });
  });

  // (139) check second expression
  const curRotation = Math.floor(deps.p_tau / VALIDATOR_CORE_ROTATION);
  extrinsic.forEach(({ workReport, timeSlot, credential }) => {
    let G: GuarantorsAssignment = G_STAR_fn({
      p_eta2: toPosterior(deps.p_eta[2]),
      p_eta3: toPosterior(deps.p_eta[3]),
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
      p_psi_o: deps.p_psi_o,
      p_tau: deps.p_tau,
    });
    if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
      G = G_fn({
        entropy: deps.p_eta[2],
        p_tau: deps.p_tau,
        tauOffset: 0 as u32,
        validatorKeys: deps.p_kappa,
        p_psi_o: deps.p_psi_o,
      });
    }

    credential.forEach(({ validatorIndex }) => {
      assert(
        workReport.coreIndex === G.validatorsAssignedCore[validatorIndex],
        "Core index must match",
      );
      // And
      assert(
        VALIDATOR_CORE_ROTATION * curRotation - 1 <= timeSlot,
        "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t",
      );
      assert(
        timeSlot <= deps.p_tau,
        "Time slot must be within bounds, t <= tau'",
      );
    });
  });
  return extrinsic as Validated<EG_Extrinsic>;
};

/**
 * (134) in the graypaper
 * also handles the (135) in the graypaper
 */
const G_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Posterior<Tau>;
  validatorKeys: Posterior<SafroleState["kappa"] | SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number) => c.map((x) => (x + n) % CORES);
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: Tau) => {
    return R(
      FisherYatesH(
        Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) =>
          Math.floor((CORES * i) / NUMBER_OF_VALIDATORS),
        ),
        e,
      ),
      Math.floor(slotIndex(t) / VALIDATOR_CORE_ROTATION),
    );
  };
  return {
    validatorsAssignedCore: P(
      input.entropy,
      (input.p_tau + input.tauOffset) as Tau,
    ),
    validatorsED22519Key: PHI_FN(input.validatorKeys, input.p_psi_o).map(
      (v) => v.ed25519,
    ),
  } as GuarantorsAssignment;
};

/**
 * (135) in the graypaper
 */
export const G_STAR_fn = (input: {
  p_eta2: Posterior<SafroleState["eta"][2]>;
  p_eta3: Posterior<SafroleState["eta"][3]>;
  p_kappa: Posterior<SafroleState["kappa"]>;
  p_lambda: Posterior<SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
  p_tau: Posterior<Tau>;
}) => {
  if (
    slotIndex((input.p_tau - VALIDATOR_CORE_ROTATION) as Tau) ==
    slotIndex(input.p_tau)
  ) {
    return G_fn({
      entropy: input.p_eta2,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  } else {
    return G_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  }
};
