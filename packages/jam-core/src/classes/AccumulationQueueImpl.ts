import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  codec,
  createArrayLengthDiscriminator,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  lengthDiscriminatedSetCodec,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  AccumulationQueue,
  AvailableWithPrereqWorkReports,
  Posterior,
  SeqOfLength,
  Tau,
  WorkPackageHash,
} from "@tsjam/types";
import { WorkReportImpl } from "./WorkReportImpl";
import { E_Fn } from "@/accumulate";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { AccumulationHistoryImpl } from "./AccumulationHistoryImpl";

@JamCodecable()
export class AccumulationQueueItem extends BaseJamCodecable {
  /**
   * `bold_r`
   */
  @codec(WorkReportImpl)
  workReport!: WorkReportImpl;
  /**
   * `bold_d`
   * the unaccumulated dependencies of the workreport
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  dependencies!: Set<WorkPackageHash>;

  constructor(config: ConditionalExcept<AccumulationQueueItem, Function>) {
    super();
    Object.assign(this, config);
  }
}

export class AccumulationQueueImpl
  extends BaseJamCodecable
  implements AccumulationQueue
{
  @sequenceCodec(
    EPOCH_LENGTH,
    {
      ...createArrayLengthDiscriminator(AccumulationQueueItem),
      ...ArrayOfJSONCodec(AccumulationQueueItem),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<Array<AccumulationQueueItem>, typeof EPOCH_LENGTH>;

  toPosterior(deps: {
    tau: Tau;
    p_tau: Posterior<Tau>;
    r_q: AccumulationQueueItem[];
    p_accumulationHistory: Posterior<AccumulationHistoryImpl>;
  }): Posterior<AccumulationQueueImpl> {
    const toRet: AccumulationQueueImpl = new AccumulationQueueImpl();
    toRet.elements = structuredClone(this.elements);
    const m = deps.p_tau % EPOCH_LENGTH; // $(0.7.0 - 12.10)

    for (let i = 0; i < EPOCH_LENGTH; i++) {
      const index = (m - i + EPOCH_LENGTH) % EPOCH_LENGTH;
      if (i === 0) {
        toRet.elements[index] = toPosterior(
          E_Fn(deps.r_q, deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1]),
        );
      } else if (i < deps.p_tau - deps.tau) {
        toRet.elements[index] = toPosterior([]);
      } else {
        toRet.elements[index] = toPosterior(
          E_Fn(
            toRet.elements[index],
            deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1],
          ),
        );
      }
    }
    return toPosterior(toRet);
  }
}
