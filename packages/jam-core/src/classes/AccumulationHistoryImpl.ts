import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SetJSONCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  AccumulationHistory,
  Posterior,
  SeqOfLength,
  WorkPackageHash,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { AccumulatableWorkReports, WorkReportImpl } from "./WorkReportImpl";
import { ConditionalExcept } from "type-fest";
import { IdentitySetCodec } from "@/data_structures/identitySet";
import { HashCodec } from "@/codecs/miscCodecs";

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
  elements!: SeqOfLength<Set<WorkPackageHash>, typeof EPOCH_LENGTH>;
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
    return new Set(this.elements.map((a) => [...a.values()]).flat());
  }

  /**
   * $(0.7.1 - 12.30 / 12.31)
   */
  toPosterior(deps: {
    r_star: AccumulatableWorkReports;
    nAccumulatedWork: number;
  }): Posterior<AccumulationHistoryImpl> {
    const toRet = new AccumulationHistoryImpl();
    toRet.elements = structuredClone(this.elements);
    const slicedR = deps.r_star.slice(0, deps.nAccumulatedWork);

    // $(0.7.1 - 12.30)
    toRet.elements[EPOCH_LENGTH - 1] =
      WorkReportImpl.extractWorkPackageHashes(slicedR);
    for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
      toRet.elements[i] = this.elements[i + 1];
    }
    return toPosterior(toRet);
  }
}
