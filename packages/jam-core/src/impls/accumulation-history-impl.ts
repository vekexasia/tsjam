import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet, IdentitySetCodec } from "@/data-structures/identity-set";
import {
  BaseJamCodecable,
  cloneCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import type {
  AccumulationHistory,
  Posterior,
  SeqOfLength,
  WorkPackageHash,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { ConditionalExcept } from "type-fest";
import {
  type AccumulatableWorkReports,
  WorkReportImpl,
} from "./work-report-impl";

/**
 * `ξ` in the graypaper
 * Defines the wph that have been accumulated
 * $(0.7.1 - 12.1)
 */
@JamCodecable()
export class AccumulationHistoryImpl
  extends BaseJamCodecable
  implements AccumulationHistory
{
  @sequenceCodec(
    EPOCH_LENGTH,
    IdentitySetCodec(HashCodec),
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<IdentitySet<WorkPackageHash>, typeof EPOCH_LENGTH>;
  constructor(config?: ConditionalExcept<AccumulationHistoryImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  /**
   * Computes the union of the AccumulationHistory
   * $(0.7.1 - 12.2)
   */
  union() {
    return new IdentitySet(this.elements.map((a) => [...a.values()]).flat());
  }

  /**
   * $(0.7.1 - 12.30 / 12.31)
   */
  toPosterior(deps: {
    r_star: AccumulatableWorkReports;
    nAccumulatedWork: number;
  }): Posterior<AccumulationHistoryImpl> {
    const toRet: AccumulationHistoryImpl = cloneCodecable(this);
    const slicedR = deps.r_star.slice(0, deps.nAccumulatedWork);

    // $(0.7.1 - 12.30)
    toRet.elements[EPOCH_LENGTH - 1] =
      WorkReportImpl.extractWorkPackageHashes(slicedR);
    for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
      toRet.elements[i] = this.elements[i + 1];
    }
    return toPosterior(toRet);
  }

  static newEmpty(): AccumulationHistoryImpl {
    return new AccumulationHistoryImpl({
      elements: <AccumulationHistoryImpl["elements"]>(
        Array.from({ length: EPOCH_LENGTH }, () => new IdentitySet())
      ),
    });
  }
}
