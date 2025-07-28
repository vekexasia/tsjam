import { appendMMR, wellBalancedBinaryMerkleRoot } from "@/merklization";
import {
  BaseJamCodecable,
  codec,
  HashCodec,
  HashJSONCodec,
  JamCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  NULLORCodec,
  Optional,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Beta, Dagger, Hash, HeaderHash, Validated } from "@tsjam/types";
import { toDagger, toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { GuaranteesExtrinsicImpl } from "./extrinsics/guarantees";
import { JamHeaderImpl } from "./JamHeaderImpl";
import { JamStateImpl } from "./JamStateImpl";
import { RecentHistoryImpl } from "./RecentHistoryImpl";

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
    ...NULLORCodec(HashJSONCodec()),
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
      p_theta: JamStateImpl["mostRecentAccumulationOutputs"];
      headerHash: HeaderHash; // h
      eg: Validated<GuaranteesExtrinsicImpl>;
    },
  ) {
    // $(0.7.0 - 7.7) - beefyBelt
    const s = deps.p_theta.elements.map((a) => a.toBinary());
    const p_beefyBelt = toPosterior(
      appendMMR(
        d_beta.beefyBelt,
        wellBalancedBinaryMerkleRoot(s, Hashing.keccak256),
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
