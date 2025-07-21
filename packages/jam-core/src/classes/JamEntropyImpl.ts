import { BaseJamCodecable, hashCodec, JamCodecable } from "@tsjam/codec";
import { Blake2bHash, JamEntropy } from "@tsjam/types";

/**
 * `η`
 * $(0.7.0 - 6.21)
 */
@JamCodecable()
export class JamEntropyImpl extends BaseJamCodecable implements JamEntropy {
  @hashCodec()
  _0!: Blake2bHash;

  @hashCodec()
  _1!: Blake2bHash;

  @hashCodec()
  _2!: Blake2bHash;

  @hashCodec()
  _3!: Blake2bHash;
}
