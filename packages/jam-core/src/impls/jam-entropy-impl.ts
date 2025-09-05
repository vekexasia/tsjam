import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  codec,
  encodeWithCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import type {
  Blake2bHash,
  JamEntropy,
  Posterior,
  Tagged,
  Validated,
} from "@tsjam/types";
import type { SlotImpl, TauImpl } from "./slot-impl";

/**
 * `η`
 * $(0.7.1 - 6.21)
 */
@JamCodecable(true)
export class JamEntropyImpl extends BaseJamCodecable implements JamEntropy {
  @codec(HashCodec)
  _0!: Tagged<Blake2bHash, "_0">;

  @codec(HashCodec)
  _1!: Tagged<Blake2bHash, "_1">;

  @codec(HashCodec)
  _2!: Tagged<Blake2bHash, "_2">;

  @codec(HashCodec)
  _3!: Tagged<Blake2bHash, "_3">;

  constructor(config?: JamEntropy) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  rotate1_3(deps: {
    slot: SlotImpl;
    p_tau: Validated<Posterior<TauImpl>>;
  }): Tagged<
    JamEntropyImpl & {
      _1: Posterior<Blake2bHash>;
      _2: Posterior<Blake2bHash>;
      _3: Posterior<Blake2bHash>;
    },
    "rotated_1_3"
  > {
    // $(0.7.1 - 6.23) | rotate `η_1`, `η_2`, `η_3`
    let [p_1, p_2, p_3] = [this._1, this._2, this._3];

    if (deps.p_tau.isNewerEra(deps.slot)) {
      [p_1, p_2, p_3] = [
        this._0 as Blake2bHash as JamEntropyImpl["_1"],
        this._1 as Blake2bHash as JamEntropyImpl["_2"],
        this._2 as Blake2bHash as JamEntropyImpl["_3"],
      ];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <any>new JamEntropyImpl({
      _0: this._0,
      _1: p_1,
      _2: p_2,
      _3: p_3,
    });
  }

  toPosterior(
    this: Tagged<JamEntropyImpl, "rotated_1_3">,
    deps: {
      // or eventually vrfOutputSignature of h_v
      vrfOutputHash: ReturnType<typeof Bandersnatch.vrfOutputSeed>;
    },
  ): Posterior<
    JamEntropyImpl & {
      _0: Posterior<Blake2bHash>;
      _1: Posterior<Blake2bHash>;
      _2: Posterior<Blake2bHash>;
      _3: Posterior<Blake2bHash>;
    }
  > {
    // $(0.7.1 - 6.22) | rotate `η_0`
    const p_0 = Hashing.blake2b(
      new Uint8Array([
        ...encodeWithCodec(HashCodec, this._0),
        ...encodeWithCodec(HashCodec, deps.vrfOutputHash),
      ]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <any>new JamEntropyImpl({
      _0: p_0,
      _1: this._1,
      _2: this._2,
      _3: this._3,
    });
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

  static newEmpty(): JamEntropyImpl {
    return new JamEntropyImpl({
      _0: <Blake2bHash>new Uint8Array(32).fill(0),
      _1: <Blake2bHash>new Uint8Array(32).fill(0),
      _2: <Blake2bHash>new Uint8Array(32).fill(0),
      _3: <Blake2bHash>new Uint8Array(32).fill(0),
    });
  }
}
