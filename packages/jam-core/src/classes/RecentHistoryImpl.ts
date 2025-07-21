import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { RecentHistory, RecentHistoryItem, UpToSeq } from "@tsjam/types";
import { RecentHistoryItemImpl } from "./RecentHistoryItemImpl";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";

@JamCodecable()
export class RecentHistoryImpl
  extends BaseJamCodecable
  implements RecentHistory
{
  @lengthDiscriminatedCodec(RecentHistoryItemImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<RecentHistoryItem, typeof RECENT_HISTORY_LENGTH>;
}
