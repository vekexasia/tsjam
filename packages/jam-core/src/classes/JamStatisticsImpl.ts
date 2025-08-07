import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { Dagger, JamStatistics, Posterior, Validated } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { AccumulationStatisticsImpl } from "./AccumulationStatisticsImpl";
import { CoreStatisticsImpl } from "./CoreStatisticsImpl";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { JamBlockExtrinsicsImpl } from "./JamBlockExtrinsicsImpl";
import { JamEntropyImpl } from "./JamEntropyImpl";
import { JamHeaderImpl } from "./JamHeaderImpl";
import { JamStateImpl } from "./JamStateImpl";
import { RHOImpl } from "./RHOImpl";
import { ServicesStatisticsImpl } from "./ServicesStatisticsImpl";
import { TauImpl } from "./SlotImpl";
import { ValidatorStatisticsImpl } from "./ValidatorStatisticsImpl";
import { AssurancesExtrinsicImpl } from "./extrinsics/assurances";
import { PreimagesExtrinsicImpl } from "./extrinsics/preimages";

/**
 * $(0.7.1 - 13.1)
 */
@JamCodecable()
export class JamStatisticsImpl
  extends BaseJamCodecable
  implements JamStatistics
{
  @codec(ValidatorStatisticsImpl)
  validators!: ValidatorStatisticsImpl;

  /**
   * `πC`
   */
  @codec(CoreStatisticsImpl)
  cores!: CoreStatisticsImpl;

  /**
   * `πS`
   */
  @codec(ServicesStatisticsImpl)
  services!: ServicesStatisticsImpl;

  constructor(config?: ConditionalExcept<JamStatisticsImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  toPosterior(deps: {
    tau: TauImpl;
    p_tau: Validated<Posterior<TauImpl>>;
    extrinsics: JamBlockExtrinsicsImpl;
    ea: Validated<AssurancesExtrinsicImpl>;
    ep: Validated<PreimagesExtrinsicImpl>;
    d_rho: Dagger<RHOImpl>;
    p_disputes: Posterior<DisputesStateImpl>;
    authorIndex: JamHeaderImpl["authorIndex"];
    p_entropy: Posterior<JamEntropyImpl>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
    accumulationStatistics: AccumulationStatisticsImpl;
  }): Posterior<JamStatisticsImpl> {
    const bold_I = deps.extrinsics.reportGuarantees.workReports();
    const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(
      deps.ea,
      deps.d_rho,
    );
    const toRet = new JamStatisticsImpl();
    toRet.validators = this.validators.toPosterior({
      tau: deps.tau,
      p_tau: deps.p_tau,
      extrinsics: deps.extrinsics,
      p_disputes: deps.p_disputes,
      authorIndex: deps.authorIndex,
      p_entropy: deps.p_entropy,
      p_kappa: deps.p_kappa,
      p_lambda: deps.p_lambda,
    });

    toRet.cores = this.cores.toPosterior({
      ea: deps.ea,
      d_rho: deps.d_rho,
      bold_I,
      bold_R,
    });

    toRet.services = this.services.toPosterior({
      ep: deps.ep,
      guaranteedReports: bold_I,
      accumulationStatistics: deps.accumulationStatistics,
    });

    return toPosterior(toRet);
  }
}
