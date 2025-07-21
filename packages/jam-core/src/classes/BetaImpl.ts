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
import { Beta, Hash } from "@tsjam/types";
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
}
