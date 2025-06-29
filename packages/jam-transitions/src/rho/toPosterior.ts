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
 * $(0.6.4 - 11.42)
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
  // $(0.6.4 - 11.42)
  return ok(
    curState.map((w, coreIndex: number) => {
      const ext = input.EG_Extrinsic.find(
        ({ workReport }) => workReport.core === coreIndex,
      );
      if (typeof ext === "undefined") {
        return w;
      }
      return {
        workReport: ext.workReport,
        reportTime: input.p_tau,
      };
    }) as Posterior<RHO>,
  );
};
