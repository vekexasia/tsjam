import {
  BaseJamCodecable,
  codec,
  encodeWithCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { Blake2bHash, JamEntropy, Posterior, Validated } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { JamStateImpl } from "./JamStateImpl";
import { TauImpl } from "./SlotImpl";
import { HashCodec } from "@/codecs/miscCodecs";

/**
 * `η`
 * $(0.7.1 - 6.21)
// FIXME: toJSON and fromJSON are wrong because of named params instead of array:
 */
@JamCodecable()
export class JamEntropyImpl extends BaseJamCodecable implements JamEntropy {
  @codec(HashCodec)
  _0!: Blake2bHash;

  @codec(HashCodec)
  _1!: Blake2bHash;

  @codec(HashCodec)
  _2!: Blake2bHash;

  @codec(HashCodec)
  _3!: Blake2bHash;

  constructor(config?: JamEntropy) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      // or eventually vrfOutputSignature of h_v
      vrfOutputHash: ReturnType<typeof Bandersnatch.vrfOutputSeed>;
    },
  ): Posterior<JamEntropyImpl> {
    // $(0.7.1 - 6.22) | rotate `η_0`
    const p_0 = Hashing.blake2b(
      new Uint8Array([
        ...encodeWithCodec(HashCodec, this._0),
        ...encodeWithCodec(HashCodec, deps.vrfOutputHash),
      ]),
    );

    // $(0.7.1 - 6.23) | rotate `η_1`, `η_2`, `η_3`

    let [p_1, p_2, p_3] = [this._1, this._2, this._3];

    if (deps.p_tau.isNewerEra(curState.slot)) {
      [p_1, p_2, p_3] = [this._0, this._1, this._2];
    }
    return toPosterior(
      new JamEntropyImpl({
        _0: p_0,
        _1: p_1,
        _2: p_2,
        _3: p_3,
      }),
    );
  }
}
