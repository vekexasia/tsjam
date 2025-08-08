import { appendMMR, wellBalancedBinaryMerkleRoot } from "@/merklization";
import {
  BaseJamCodecable,
  codec,
  JamCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  NULLORCodec,
  Optional,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  Beta,
  Dagger,
  Hash,
  HeaderHash,
  Posterior,
  Validated,
} from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { JamHeaderImpl } from "./JamHeaderImpl";
import { LastAccOutsImpl } from "./LastAccOutsImpl";
import { RecentHistoryImpl } from "./RecentHistoryImpl";
import { HashCodec } from "@/codecs/miscCodecs";

/**
 * $(0.7.1 - 7.1 / 7.3)
 */
@JamCodecable()
export class BetaImpl extends BaseJamCodecable implements Beta {
  /**
   * `h`
   */
  @codec(RecentHistoryImpl)
  recentHistory!: RecentHistoryImpl;
  /**
   * `b`
   * encoded via $(0.7.0 - E.9) - `EM`
   */
  @lengthDiscriminatedCodec({
    ...(<JamCodec<undefined | Hash>>new Optional<Hash>(HashCodec)),
    ...NULLORCodec(HashCodec),
  })
  beefyBelt!: Array<Hash | undefined>;

  constructor(config?: ConditionalExcept<BetaImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  /**
   * Basically a wrapper for `toDagger` on `recentHistory`
   */
  toDagger(header: JamHeaderImpl): Dagger<BetaImpl> {
    return toDagger(
      new BetaImpl({
        recentHistory: this.recentHistory.toDagger(header),
        beefyBelt: this.beefyBelt,
      }),
    );
  }

  static toPosterior(
    d_beta: Dagger<BetaImpl>,
    deps: {
      p_theta: Posterior<LastAccOutsImpl>;
      headerHash: HeaderHash; // h
      eg: Validated<GuaranteesExtrinsicImpl>;
    },
  ) {
    // $(0.7.1 - 7.6) - calculate bold_s
    const bold_s = deps.p_theta.elements.map((a) => a.toBinary());
    // $(0.7.1 - 7.7) - calculate beefyBelt
    const p_beefyBelt = toPosterior(
      appendMMR(
        d_beta.beefyBelt,
        wellBalancedBinaryMerkleRoot(bold_s, Hashing.keccak256),
        Hashing.keccak256,
      ),
    );

    return toPosterior(
      new BetaImpl({
        beefyBelt: p_beefyBelt,
        recentHistory: RecentHistoryImpl.toPosterior(
          toDagger(d_beta.recentHistory),
          {
            p_beefyBelt,
            eg: deps.eg,
            headerHash: deps.headerHash,
          },
        ),
      }),
    );
  }
}
