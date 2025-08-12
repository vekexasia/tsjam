import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  cloneCodecable,
  createArrayLengthDiscriminator,
  createSequenceCodec,
  JamCodecable,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { AccumulationQueue, Posterior, SeqOfLength } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import type { AccumulationHistoryImpl } from "./accumulation-history-impl";
import { E_Fn } from "./new-work-reports-impl";
import type { SlotImpl, TauImpl } from "./slot-impl";
import { AccumulationQueueItem } from "./accumulation-queue-item";

/**
 * `ω`
 * Defines the ready but not yet accumulated work reports
 * $(0.7.1 - 12.3)
 */
@JamCodecable()
export class AccumulationQueueImpl
  extends BaseJamCodecable
  implements AccumulationQueue
{
  @jsonCodec(
    ArrayOfJSONCodec(ArrayOfJSONCodec(AccumulationQueueItem)),
    SINGLE_ELEMENT_CLASS,
  )
  @binaryCodec(
    createSequenceCodec(
      EPOCH_LENGTH,
      createArrayLengthDiscriminator(AccumulationQueueItem),
    ),
  )
  elements!: SeqOfLength<Array<AccumulationQueueItem>, typeof EPOCH_LENGTH>;

  constructor(config?: ConditionalExcept<AccumulationQueueImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  /**
   * $(0.7.1 - 12.32)
   */
  toPosterior(deps: {
    tau: SlotImpl;
    p_tau: Posterior<TauImpl>;
    r_q: AccumulationQueueItem[];
    p_accumulationHistory: Posterior<AccumulationHistoryImpl>;
  }): Posterior<AccumulationQueueImpl> {
    const toRet: AccumulationQueueImpl = cloneCodecable(this);
    const m = deps.p_tau.slotPhase(); // $(0.7.1 - 12.10)

    for (let i = 0; i < EPOCH_LENGTH; i++) {
      const index = (m - i + EPOCH_LENGTH) % EPOCH_LENGTH;
      if (i === 0) {
        toRet.elements[index] = toPosterior(
          E_Fn(deps.r_q, deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1]),
        );
      } else if (i < deps.p_tau.value - deps.tau.value) {
        toRet.elements[index] = toPosterior([]);
      } else {
        toRet.elements[index] = toPosterior(
          E_Fn(
            this.elements[index],
            deps.p_accumulationHistory.elements[EPOCH_LENGTH - 1],
          ),
        );
      }
    }
    return toPosterior(toRet);
  }
}
