import { slotIndex, toPosterior } from "@tsjam/utils";
import {
  DoubleDagger,
  EG_Extrinsic,
  G_Star,
  GuarantorsAssignment,
  Hash,
  IDisputesState,
  JamState,
  Posterior,
  RHO,
  Tau,
  Validated,
  u32,
} from "@tsjam/types";
import {
  CORES,
  JAM_GUARANTEE,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
  WORK_TIMEOUT,
} from "@tsjam/constants";
import { WorkReportCodec, encodeWithCodec } from "@tsjam/codec";
import { Ed25519, Hashing } from "@tsjam/crypto";
import { FisherYatesH } from "@tsjam/crypto";
import { PHI_FN, _w } from "@tsjam/transitions";
import { Result, err, ok } from "neverthrow";

export enum EGError {
  EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES = "Extrinsic length must be less than CORES",
  CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "core index must be unique and ordered",
  CORE_INDEX_NOT_IN_BOUNDS = "core index not in bounds",
  CREDS_MUST_BE_BETWEEN_2_AND_3 = "credential length must be between 2 and 3",
  VALIDATOR_INDEX_MUST_BE_IN_BOUNDS = "validator index must be 0 <= x < V",
  VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED = "validator index must be unique and ordered",
  SIGNATURE_INVALID = "EG signature is invalid",
  CORE_INDEX_MISMATCH = "Core index mismatch",
  TIMESLOT_BOUNDS_1 = "Time slot must be within bounds, R * floor(tau'/R) - 1 <= t",
  TIMESLOT_BOUNDS_2 = "Time slot must be within bounds, t <= tau'",
  WORK_PACKAGE_HASH_NOT_UNIQUE = "Work package hash must be unique",
  LOOKUP_ANCHOR_NOT_WITHIN_L = "Lookup anchor block must be within L timeslots",
  REPORT_PENDING_AVAILABILITY = "Bit may be set if the corresponding core has a report pending availability",
}

export const assertEGValid = (
  extrinsic: EG_Extrinsic,
  deps: {
    dd_rho: DoubleDagger<RHO>;
    p_entropy: Posterior<JamState["entropy"]>;
    kappa: JamState["kappa"];
    p_kappa: Posterior<JamState["kappa"]>;
    p_lambda: Posterior<JamState["lambda"]>;
    p_tau: Posterior<Tau>;
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
  },
): Result<Validated<EG_Extrinsic>, EGError> => {
  if (extrinsic.length === 0) {
    return ok(extrinsic as Validated<EG_Extrinsic>); // optimization
  }
  // $(0.5.0 - 11.22)
  if (extrinsic.length > CORES) {
    return err(EGError.EXTRINSIC_LENGTH_MUST_BE_LESS_THAN_CORES);
  }

  // $(0.5.0 - 11.23) - make sure they're ordered and uniqueby coreindex
  for (let i = 1; i < extrinsic.length; i++) {
    const [prev, next] = [extrinsic[i - 1], extrinsic[i]];
    if (prev.workReport.coreIndex >= next.workReport.coreIndex) {
      return err(EGError.CORE_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
    }
    if (next.workReport.coreIndex >= CORES || next.workReport.coreIndex < 0) {
      return err(EGError.CORE_INDEX_NOT_IN_BOUNDS);
    }
  }

  for (const { credential } of extrinsic) {
    // $(0.5.0 - 11.22)
    if (credential.length < 2 || credential.length > 3) {
      return err(EGError.CREDS_MUST_BE_BETWEEN_2_AND_3);
    }
    // $(0.5.0 - 11.24) | creds must be ordered by their val idx
    for (let i = 1; i < credential.length; i++) {
      const [prev, next] = [credential[i - 1], credential[i]];
      if (prev.validatorIndex >= next.validatorIndex) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_UNIQUE_AND_ORDERED);
      }
    }
  }

  for (const ext of extrinsic) {
    const wrh = Hashing.blake2bBuf(
      encodeWithCodec(WorkReportCodec, ext.workReport),
    );
    const messageToSign = new Uint8Array([...JAM_GUARANTEE, ...wrh]);

    for (const cred of ext.credential) {
      // $(0.5.0 - 11.22) | should be Nv
      if (
        cred.validatorIndex < 0 ||
        cred.validatorIndex >= NUMBER_OF_VALIDATORS
      ) {
        return err(EGError.VALIDATOR_INDEX_MUST_BE_IN_BOUNDS);
      }

      // $(0.5.0 - 11.25)
      const isValid = Ed25519.verifySignature(
        cred.signature,
        deps.kappa[cred.validatorIndex].ed25519,
        messageToSign,
      );
      if (!isValid) {
        return err(EGError.SIGNATURE_INVALID);
      }
    }
  }

  // $(0.5.0 - 11.25)
  const curRotation = Math.floor(deps.p_tau / VALIDATOR_CORE_ROTATION);
  for (const { workReport, timeSlot, credential } of extrinsic) {
    let G: GuarantorsAssignment = G_STAR_fn({
      p_eta2: toPosterior(deps.p_entropy[2]),
      p_eta3: toPosterior(deps.p_entropy[3]),
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
      p_psi_o: deps.p_psi_o,
      p_tau: deps.p_tau,
    });
    if (curRotation === Math.floor(timeSlot / VALIDATOR_CORE_ROTATION)) {
      G = G_fn({
        entropy: deps.p_entropy[2],
        p_tau: deps.p_tau,
        tauOffset: 0 as u32,
        validatorKeys: deps.p_kappa,
        p_psi_o: deps.p_psi_o,
      });
    }

    for (const { validatorIndex } of credential) {
      if (workReport.coreIndex !== G.validatorsAssignedCore[validatorIndex]) {
        return err(EGError.CORE_INDEX_MISMATCH);
      }

      // And
      if (VALIDATOR_CORE_ROTATION * curRotation - 1 > timeSlot) {
        return err(EGError.TIMESLOT_BOUNDS_1);
      }
      if (timeSlot > deps.p_tau) {
        return err(EGError.TIMESLOT_BOUNDS_2);
      }
    }
  }

  // $(0.5.0 - 11.27)
  const w = _w(extrinsic);

  // $(0.5.0 - 11.28) | no reports can be placed in core when there is something pending
  // and that pending stuff is not expird
  // TODO: is missing a piece
  for (let i = 0; i < w.length; i++) {
    const { coreIndex } = w[i];
    if (
      !(
        typeof deps.dd_rho[coreIndex] === "undefined" ||
        deps.p_tau >= deps.dd_rho[coreIndex]!.reportTime + WORK_TIMEOUT
      )
    ) {
      return err(EGError.REPORT_PENDING_AVAILABILITY);
    }
  }

  // $(0.5.0 - 11.30)
  const x = w.map(({ refinementContext }) => refinementContext);
  const p = w.map(
    ({ workPackageSpecification }) => workPackageSpecification.workPackageHash,
  );

  // $(0.5.0 - 11.31)
  if (p.length !== new Set(p).size) {
    return err(EGError.WORK_PACKAGE_HASH_NOT_UNIQUE);
  }

  // $(0.5.0 - 11.33) each lookup anchor block within `L` timeslot
  for (const refinementContext of x) {
    if (
      refinementContext.lookupAnchor.timeSlot <
      deps.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR
    ) {
      return err(EGError.LOOKUP_ANCHOR_NOT_WITHIN_L);
    }
  }

  return ok(extrinsic as Validated<EG_Extrinsic>);
};

/**
 * $(0.5.0 - 11.18 / 11.19 / 11.20)
 */
const G_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Posterior<Tau>;
  validatorKeys: Posterior<JamState["kappa"] | JamState["lambda"]>;
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
 * $(0.5.0 - 11.21)
 */
export const G_STAR_fn = (input: {
  p_eta2: Posterior<JamState["entropy"][2]>;
  p_eta3: Posterior<JamState["entropy"][3]>;
  p_kappa: Posterior<JamState["kappa"]>;
  p_lambda: Posterior<JamState["lambda"]>;
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
