import {
  DoubleDagger,
  EG_Extrinsic,
  Posterior,
  RHO,
  SafroleState,
  Tau,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import {
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  WORK_TIMEOUT,
} from "@vekexasia/jam-constants";
import { newSTF } from "@vekexasia/jam-utils";
import { _w } from "@/utilityComputations/w.js";

export const RHO_toPosterior = newSTF<
  DoubleDagger<RHO>,
  {
    EG_Extrinsic: EG_Extrinsic;
    kappa: SafroleState["kappa"];
    p_tau: Posterior<Tau>;
  },
  Posterior<RHO>
>({
  apply(
    input: {
      EG_Extrinsic: EG_Extrinsic;
      kappa: SafroleState["kappa"];
      p_tau: Posterior<Tau>;
    },
    curState: DoubleDagger<RHO>,
  ): Posterior<RHO> {
    return curState.map((w, coreIndex: number) => {
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
    }) as Posterior<RHO>;
  },

  assertInputValid(input, curState) {
    const ext = input.EG_Extrinsic;
    if (ext.length == 0) {
      return; // optimization
    }

    // (141)
    const w = _w(input.EG_Extrinsic);

    // (142) - no reports can be placed in core when there is something pending
    // and that pending stuff is not expird
    // TODO is missing a piece
    w.forEach(({ coreIndex }) => {
      assert(
        curState[coreIndex] === null ||
          input.p_tau >= curState[coreIndex]!.reportTime + WORK_TIMEOUT,
        "Bit may be set if the corresponding core has a report pending availability",
      );
    });

    // (144)
    const x = w.map(({ refinementContext }) => refinementContext);
    const p = w.map(
      ({ workPackageSpecification }) =>
        workPackageSpecification.workPackageHash,
    );

    // (145)
    assert(new Set(p).size === p.length, "Work package hash must be unique");

    // (147) each lookup anchor block within `L` timeslot
    x.forEach((refinementContext) => {
      assert(
        refinementContext.lookupAnchor.timeSlot >=
          input.p_tau - MAXIMUM_AGE_LOOKUP_ANCHOR,
        "Lookup anchor block must be within L timeslots",
      );
    });
  },

  assertPStateValid() {},
});
