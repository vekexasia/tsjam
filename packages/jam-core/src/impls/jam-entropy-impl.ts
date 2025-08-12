import {
  BaseJamCodecable,
  codec,
  encodeWithCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import { Blake2bHash, JamEntropy, Posterior, Validated } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { HashCodec } from "@/codecs/misc-codecs";

/**
 * `η`
 * $(0.7.1 - 6.21)
 */
@JamCodecable(true)
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

  static fromJSON<T extends typeof BaseJamCodecable>(
    this: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: any,
  ): InstanceType<T> {
    return <InstanceType<T>>new JamEntropyImpl({
      _0: <Blake2bHash>HashCodec.fromJSON(json[0]),
      _1: <Blake2bHash>HashCodec.fromJSON(json[1]),
      _2: <Blake2bHash>HashCodec.fromJSON(json[2]),
      _3: <Blake2bHash>HashCodec.fromJSON(json[3]),
    });
  }

  static toJSON<T extends typeof BaseJamCodecable>(
    this: T,
    value: InstanceType<T>,
  ): object {
    const v = <JamEntropyImpl>value;
    return [v._0, v._1, v._2, v._3].map((h) => HashCodec.toJSON(h));
  }
}
