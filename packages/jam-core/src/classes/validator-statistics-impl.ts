import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Posterior,
  u32,
  Validated,
  ValidatorIndex,
  ValidatorStatistics,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { DisputesStateImpl } from "./disputes-state-impl";
import { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { JamHeaderImpl } from "./jam-header-impl";
import { JamStateImpl } from "./jam-state-impl";
import { SingleValidatorStatisticsImpl } from "./single-validator-statistics-impl";
import { ValidatorStatisticsCollectionImpl } from "./validator-statistics-collection-impl";
import { ConditionalExcept } from "type-fest";
import { TauImpl } from "./slot-impl";

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
  previous!: ValidatorStatisticsCollectionImpl;

  /**
   * `πL`
   */
  @codec(ValidatorStatisticsCollectionImpl)
  accumulator!: ValidatorStatisticsCollectionImpl;

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
    p_disputes: Posterior<DisputesStateImpl>;
    p_entropy: Posterior<JamEntropyImpl>;
    p_lambda: Posterior<JamStateImpl["lambda"]>;
  }) {
    const reporters = deps.extrinsics.reportGuarantees.reporters({
      p_tau: deps.p_tau,
      p_lambda: deps.p_lambda,
      p_kappa: deps.p_kappa,
      p_disputes: deps.p_disputes,
      p_entropy: deps.p_entropy,
    });
    const toRet = structuredClone(this);

    // $(0.7.1 - 13.3 / 13.4)
    let bold_a = toRet.previous;
    if (deps.p_tau.isNewerEra(deps.tau)) {
      bold_a = new ValidatorStatisticsCollectionImpl({
        elements: toTagged(
          new Array(NUMBER_OF_VALIDATORS).fill(0).map(() => {
            return new SingleValidatorStatisticsImpl({
              blocks: <u32>0,
              tickets: <u32>0,
              preimageCount: <u32>0,
              preimageSize: <u32>0,
              guarantees: <u32>0,
              assurances: <u32>0,
            });
          }),
        ),
      });
    }

    for (let v = <ValidatorIndex>0; v < NUMBER_OF_VALIDATORS; v++) {
      const curV = v === deps.authorIndex;
      // $(0.7.1 - 13.5)
      toRet.previous.elements[v] = new SingleValidatorStatisticsImpl({
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
            (reporters.has(deps.p_kappa.at(v).ed25519) ? 1 : 0))
        ),
        assurances: <u32>(
          (bold_a.elements[v].assurances +
            deps.extrinsics.assurances.elements.filter(
              (a) => a.validatorIndex === v,
            ).length)
        ),
      });
    }

    return toRet;
  }
}
