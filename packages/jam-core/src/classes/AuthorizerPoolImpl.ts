import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  createArrayLengthDiscriminator,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { AUTHPOOL_SIZE, AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";
import {
  AuthorizerPool,
  CoreIndex,
  Hash,
  Posterior,
  SeqOfLength,
  Tau,
  UpToSeq,
  Validated,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { ConditionalExcept } from "type-fest";
const codec = createArrayLengthDiscriminator(HashCodec);
/**
 * `α`
 * $(0.7.1 - 8.1)
 */
@JamCodecable()
export class AuthorizerPoolImpl
  extends BaseJamCodecable
  implements AuthorizerPool
{
  @sequenceCodec(
    CORES,
    {
      encode: codec.encode.bind(codec),
      decode: codec.decode.bind(codec),
      encodedSize: codec.encodedSize.bind(codec),
      ...ArrayOfJSONCodec(HashJSONCodec()),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<UpToSeq<Hash, typeof AUTHPOOL_SIZE>, typeof CORES>;
  constructor(config?: ConditionalExcept<AuthorizerPoolImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  elementAt(core: CoreIndex): UpToSeq<Hash, typeof AUTHPOOL_SIZE> {
    return this.elements[core];
  }

  // $(0.7.1 - 8.2 / 8.3)
  toPosterior(deps: {
    eg: Validated<GuaranteesExtrinsicImpl>;
    p_queue: Posterior<AuthorizerQueueImpl>;
    p_tau: Posterior<Tau>;
  }): Posterior<AuthorizerPoolImpl> {
    const newState = new AuthorizerPoolImpl();
    newState.elements = toTagged([]);

    for (let core = <CoreIndex>0; core < this.elements.length; core++) {
      const fromQueue =
        deps.p_queue.queueAtCore(core)[deps.p_tau % AUTHQUEUE_MAX_SIZE];
      let hashes: Hash[];
      const firstWReport = deps.eg.elementForCore(core);
      // second bracket
      if (typeof firstWReport === "undefined") {
        // F(c) results in queue[c]
        hashes = [...this.elements[core], fromQueue];
      } else {
        // F(c) says we need to remove the leftmost workReport.hash from the curState
        const h = firstWReport.report.authorizerHash;
        const index = this.elements[core].findIndex((hash) => hash === h);
        hashes = [
          ...this.elements[core].slice(0, index),
          ...this.elements[core].slice(index + 1),
          fromQueue,
        ];
      }
      newState.elements.push(
        toTagged(hashes.reverse().slice(0, AUTHPOOL_SIZE).reverse()),
      );
    }
    return toPosterior(newState);
  }
}
