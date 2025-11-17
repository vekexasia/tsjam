import {
  BaseJamCodecable,
  cloneCodecable,
  codec,
  JamCodecable,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Posterior,
  u32,
  Validated,
  ValidatorIndex,
  ValidatorStatistics,
} from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";
import type { DisputesStateImpl } from "./disputes-state-impl";
import type { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import type { JamEntropyImpl } from "./jam-entropy-impl";
import type { JamHeaderImpl } from "./jam-header-impl";
import type { JamStateImpl } from "./jam-state-impl";
import { SingleValidatorStatisticsImpl } from "./single-validator-statistics-impl";
import type { TauImpl } from "./slot-impl";
import { ValidatorStatisticsCollectionImpl } from "./validator-statistics-collection-impl";

/**
 * data types (u32) is given by the codec
 */
@JamCodecable()
export class ValidatorStatisticsImpl
  extends BaseJamCodecable
  implements ValidatorStatistics
{
  /**
   * `πV`
   */
  @codec(ValidatorStatisticsCollectionImpl)
  accumulator!: ValidatorStatisticsCollectionImpl;

  /**
   * `πL`
   */
  @codec(ValidatorStatisticsCollectionImpl)
  previous!: ValidatorStatisticsCollectionImpl;

  constructor(config?: ConditionalExcept<ValidatorStatisticsImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  toPosterior(deps: {
    extrinsics: JamBlockExtrinsicsImpl;
    authorIndex: JamHeaderImpl["authorIndex"];
    tau: TauImpl;
    p_tau: Validated<Posterior<TauImpl>>;
    p_kappa: Posterior<JamStateImpl["kappa"]>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
    p_eta2: Posterior<JamEntropyImpl["_2"]>;
    p_eta3: Posterior<JamEntropyImpl["_3"]>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
  }): Posterior<ValidatorStatisticsImpl> {
    const reporters = deps.extrinsics.reportGuarantees.reporters({
      p_tau: deps.p_tau,
      p_lambda: deps.p_lambda,
      p_kappa: deps.p_kappa,
      p_offenders: deps.p_offenders,
      p_eta2: deps.p_eta2,
      p_eta3: deps.p_eta3,
    });
    const toRet = cloneCodecable(<ValidatorStatisticsImpl>this);

    // $(0.7.1 - 13.3 / 13.4)
    let bold_a = toRet.accumulator;
    if (deps.p_tau.isNewerEra(deps.tau)) {
      bold_a = ValidatorStatisticsCollectionImpl.newEmpty();
      toRet.previous = this.accumulator;
    }

    for (let v = <ValidatorIndex>0; v < NUMBER_OF_VALIDATORS; v++) {
      const curV = v === deps.authorIndex;
      // $(0.7.1 - 13.5)
      toRet.accumulator.elements[v] = new SingleValidatorStatisticsImpl({
        blocks: <u32>(bold_a.elements[v].blocks + (curV ? 1 : 0)),
        tickets: <u32>(
          (bold_a.elements[v].tickets +
            (curV ? deps.extrinsics.tickets.elements.length : 0))
        ),
        preimageCount: <u32>(
          (bold_a.elements[v].preimageCount +
            (curV ? deps.extrinsics.preimages.elements.length : 0))
        ),
        preimageSize: <u32>(
          (bold_a.elements[v].preimageSize +
            (curV
              ? deps.extrinsics.preimages.elements.reduce(
                  (acc, a) => acc + a.blob.length,
                  0,
                )
              : 0))
        ),
        guarantees: <u32>(
          (bold_a.elements[v].guarantees +
            (reporters.has(deps.p_kappa.at(v)._unsafeUnwrap().ed25519) ? 1 : 0))
        ),
        assurances: <u32>(
          (bold_a.elements[v].assurances +
            deps.extrinsics.assurances.elements.filter(
              (a) => a.validatorIndex === v,
            ).length)
        ),
      });
    }

    return <Posterior<ValidatorStatisticsImpl>>toRet;
  }

  static newEmpty() {
    return new ValidatorStatisticsImpl({
      accumulator: ValidatorStatisticsCollectionImpl.newEmpty(),
      previous: ValidatorStatisticsCollectionImpl.newEmpty(),
    });
  }
}
