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
import { ok } from "neverthrow";

/**
 * $(0.7.0 - 11.43)
 */
export const RHO_toPosterior: STF<
  DoubleDagger<RHO>,
  {
    EG_Extrinsic: Validated<EG_Extrinsic>;
    kappa: JamState["kappa"];
    p_tau: Posterior<Tau>;
  },
  never,
  Posterior<RHO>
> = (input, curState) => {
  // $(0.7.0 - 11.43)
  return ok(
    curState.map((orig, core: number) => {
      const ext = input.EG_Extrinsic.find(
        ({ workReport }) => workReport.core === core,
      );
      if (typeof ext === "undefined") {
        return orig;
      }
      return {
        workReport: ext.workReport,
        reportTime: input.p_tau,
      };
    }) as Posterior<RHO>,
  );
};
