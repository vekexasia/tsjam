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
 * `ϕ`
 * $(0.7.0 - 8.1)
 * A queue of AuthorizerHash-es, each of which will be rotated in the AuthorizerPool
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
