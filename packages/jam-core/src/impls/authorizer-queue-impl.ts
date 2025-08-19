import { HashCodec } from "@/codecs/misc-codecs";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  createSequenceCodec,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";
import {
  AuthorizerHash,
  AuthorizerQueue,
  CoreIndex,
  Hash,
  SeqOfLength,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

/**
 * `ϕ`
 * $(0.7.1 - 8.1)
 * A queue of AuthorizerHash-es, each of which will be rotated in the AuthorizerPool
 */
@JamCodecable()
export class AuthorizerQueueImpl
  extends BaseJamCodecable
  implements AuthorizerQueue
{
  @sequenceCodec(
    CORES,
    {
      ...createSequenceCodec(AUTHQUEUE_MAX_SIZE, HashCodec),
      ...ArrayOfJSONCodec<SeqOfLength<Hash, typeof AUTHQUEUE_MAX_SIZE>>(
        HashCodec,
      ),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<
    SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE>,
    typeof CORES
  >;

  constructor(config?: ConditionalExcept<AuthorizerQueueImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  queueAtCore(core: CoreIndex) {
    return this.elements[core];
  }

  static newEmpty() {
    return new AuthorizerQueueImpl({
      elements: <AuthorizerQueueImpl["elements"]>(
        Array.from({ length: CORES }, () =>
          Array.from(
            { length: AUTHQUEUE_MAX_SIZE },
            () => <Hash>new Uint8Array(32).fill(0),
          ),
        )
      ),
    });
  }
}
