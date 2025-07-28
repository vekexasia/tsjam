import {
  BaseJamCodecable,
  encodeWithCodec,
  HashCodec,
  hashCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { Blake2bHash, JamEntropy, Posterior, Tau } from "@tsjam/types";
import { isNewEra, toPosterior } from "@tsjam/utils";
import { JamStateImpl } from "./JamStateImpl";

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

  constructor(config?: JamEntropy) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_tau: Posterior<Tau>;
      // or eventually vrfOutputSignature of h_v
      vrfOutputHash: ReturnType<typeof Bandersnatch.vrfOutputSeed>;
    },
  ): Posterior<JamEntropyImpl> {
    // $(0.7.0 - 6.22) | rotate `η_0`
    const p_0 = Hashing.blake2b(
      new Uint8Array([
        ...encodeWithCodec(HashCodec, this._0),
        ...encodeWithCodec(HashCodec, deps.vrfOutputHash),
      ]),
    );

    // $(0.7.0 - 6.23) | rotate `η_1`, `η_2`, `η_3`

    let [p_1, p_2, p_3] = [this._1, this._2, this._3];

    if (isNewEra(deps.p_tau, curState.tau)) {
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
