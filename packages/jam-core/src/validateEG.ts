import {
  EG_Extrinsic,
  G_Star,
  GuarantorsAssignment,
  Posterior,
  SafroleState,
  Tau,
  Validated,
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

export const assertEGValid = (
  extrinsic: EG_Extrinsic,
  kappa: SafroleState["kappa"],
  p_G: Posterior<GuarantorsAssignment>,
  p_G_star: Posterior<G_Star>,
  p_tau: Posterior<Tau>,
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
        kappa[validatorIndex].ed25519,
        messageToSign,
      );
      assert(isValid, "EG signature is invalid");
    });
  });

  // (139) check second expression
  const curRotation = Math.floor(p_tau / VALIDATOR_CORE_ROTATION);
  extrinsic.forEach(({ workReport, timeSlot, credential }) => {
    let G: GuarantorsAssignment = p_G_star;
    if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
      G = p_G;
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
      assert(timeSlot <= p_tau, "Time slot must be within bounds, t <= tau'");
    });
  });
  return extrinsic as Validated<EG_Extrinsic>;
};
