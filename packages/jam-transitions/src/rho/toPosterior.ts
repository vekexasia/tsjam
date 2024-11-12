import {
  DoubleDagger,
  EG_Extrinsic,
  JamState,
  Posterior,
  RHO,
  STF,
  Tau,
  Validated,
} from "@tsjam/types";
import { MAXIMUM_AGE_LOOKUP_ANCHOR, WORK_TIMEOUT } from "@tsjam/constants";
import { _w } from "@/utilityComputations/w.js";
import { err, ok } from "neverthrow";
export enum RhoToPosteriorError {
  WORK_PACKAGE_HASH_NOT_UNIQUE = "Work package hash must be unique",
  LOOKUP_ANCHOR_NOT_WITHIN_L = "Lookup anchor block must be within L timeslots",
  REPORT_PENDING_AVAILABILITY = "Bit may be set if the corresponding core has a report pending availability",
}

/**
 * (152) in the greypaper
 */
export const RHO_toPosterior: STF<
  DoubleDagger<RHO>,
  {
    EG_Extrinsic: Validated<EG_Extrinsic>;
    kappa: JamState["kappa"];
    p_tau: Posterior<Tau>;
  },
  RhoToPosteriorError,
  Posterior<RHO>
> = (input, curState) => {
  const ext = input.EG_Extrinsic;
  if (ext.length > 0) {
    // (141)
    const w = _w(input.EG_Extrinsic);

    // (143) - no reports can be placed in core when there is something pending
    // and that pending stuff is not expird
    // TODO is missing a piece
    for (let i = 0; i < w.length; i++) {
      const { coreIndex } = w[i];
      if (
        !(
          typeof curState[coreIndex] === "undefined" ||
          input.p_tau >= curState[coreIndex]!.reportTime + WORK_TIMEOUT
        )
      ) {
        return err(RhoToPosteriorError.REPORT_PENDING_AVAILABILITY);
      }
    }

    // (144)
    const x = w.map(({ refinementContext }) => refinementContext);
    const p = w.map(
      ({ workPackageSpecification }) =>
        workPackageSpecification.workPackageHash,
    );

    // (145)
    if (p.length !== new Set(p).size) {
      return err(RhoToPosteriorError.WORK_PACKAGE_HASH_NOT_UNIQUE);
    }

    // (147) each lookup anchor block within `L` timeslot
    for (const refinementContext of x) {
      if (
        refinementContext.lookupAnchor.timeSlot <
        input.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR
      ) {
        return err(RhoToPosteriorError.LOOKUP_ANCHOR_NOT_WITHIN_L);
      }
    }
  }

  // (157) - 0.4.5
  return ok(
    curState.map((w, coreIndex: number) => {
      const ext = input.EG_Extrinsic.find(
        ({ workReport }) => workReport.coreIndex === coreIndex,
      );
      if (ext === undefined) {
        return w;
      }
      return {
        workReport: ext.workReport,
        reportTime: input.p_tau,
      };
    }) as Posterior<RHO>,
  );
};
