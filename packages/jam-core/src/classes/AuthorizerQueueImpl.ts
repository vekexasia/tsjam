import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  createSequenceCodec,
  HashCodec,
  HashJSONCodec,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";
import {
  AuthorizerHash,
  AuthorizerQueue,
  CoreIndex,
  SeqOfLength,
} from "@tsjam/types";

/**
 * `ω`
 * Defines the ready but not yet accumulated work reports
 * $(0.7.1 - 12.3)
 */
export class AuthorizerQueueImpl
  extends BaseJamCodecable
  implements AuthorizerQueue
{
  @sequenceCodec(
    CORES,
    {
      ...createSequenceCodec(AUTHQUEUE_MAX_SIZE, HashCodec),
      ...ArrayOfJSONCodec<
        SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE>
      >(HashJSONCodec()),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<
    SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE>,
    typeof CORES
  >;

  queueAtCore(core: CoreIndex) {
    return this.elements[core];
  }
}
