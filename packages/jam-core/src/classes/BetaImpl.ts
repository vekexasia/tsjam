import { HashCodec } from "@/codecs/miscCodecs";
import { appendMMR, wellBalancedBinaryMerkleRoot } from "@/merklization";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  codec,
  createArrayLengthDiscriminator,
  JamCodecable,
  jsonCodec,
  NULLORCodec,
  Optional,
  WrapJSONCodec,
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

/**
 * $(0.7.1 - 7.1 / 7.3)
 */
@JamCodecable()
export class BetaImpl extends BaseJamCodecable implements Beta {
  /**
   * `h`
   */
  @codec(RecentHistoryImpl, "history")
  recentHistory!: RecentHistoryImpl;
  /**
   * `b`
   * encoded via $(0.7.0 - E.9) - `EM`
   */
  @jsonCodec(
    WrapJSONCodec("peeks", ArrayOfJSONCodec(NULLORCodec(HashCodec))),
    "mmr",
  )
  @binaryCodec(createArrayLengthDiscriminator(new Optional(HashCodec)))
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

  toPosterior(
    this: Dagger<BetaImpl>,
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
        this.beefyBelt,
        wellBalancedBinaryMerkleRoot(bold_s, Hashing.keccak256),
        Hashing.keccak256,
      ),
    );

    return toPosterior(
      new BetaImpl({
        beefyBelt: p_beefyBelt,
        recentHistory: (<Dagger<RecentHistoryImpl>>(
          this.recentHistory
        )).toPosterior({
          p_beefyBelt,
          eg: deps.eg,
          headerHash: deps.headerHash,
        }),
      }),
    );
  }
}
