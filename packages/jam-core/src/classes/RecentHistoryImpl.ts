import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";
import { Dagger, RecentHistory, UpToSeq } from "@tsjam/types";
import { toDagger } from "@tsjam/utils";
import { JamHeaderImpl } from "./JamHeaderImpl";
import { RecentHistoryItemImpl } from "./RecentHistoryItemImpl";

@JamCodecable()
export class RecentHistoryImpl
  extends BaseJamCodecable
  implements RecentHistory
{
  @lengthDiscriminatedCodec(RecentHistoryItemImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<RecentHistoryItemImpl, typeof RECENT_HISTORY_LENGTH>;

  /**
   * $(0.7.0 - 4.6 / 7.5)
   */
  toDagger(header: JamHeaderImpl): Dagger<RecentHistoryImpl> {
    if (this.elements.length === 0) {
      return toDagger(this);
    }

    const toRet = structuredClone(this);

    toRet.elements[toRet.elements.length - 1].stateRoot =
      header.parentStateRoot;
    return toDagger(toRet);
  }
}
