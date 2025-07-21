import {
  JamCodecable,
  BaseJamCodecable,
  lengthDiscriminatedSetCodec,
  HashCodec,
  HashJSONCodec,
  ed25519PubkeyBigIntCodec,
  BigIntBytesJSONCodec,
  Ed25519PubkeyBigIntCodec,
} from "@tsjam/codec";
import { ED25519PublicKey, Hash, IDisputesState } from "@tsjam/types";

/**
 * Codec follows C(5) from $(0.7.0 - D.2)
 */
@JamCodecable()
export class DisputesStateImpl
  extends BaseJamCodecable
  implements IDisputesState
{
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */

  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  good!: Set<Hash>;
  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  bad!: Set<Hash>;
  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  wonky!: Set<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  @lengthDiscriminatedSetCodec({
    ...Ed25519PubkeyBigIntCodec,
    ...BigIntBytesJSONCodec<ED25519PublicKey["bigint"], 32>(
      Ed25519PubkeyBigIntCodec,
    ),
  })
  offenders!: Set<ED25519PublicKey["bigint"]>;
}
