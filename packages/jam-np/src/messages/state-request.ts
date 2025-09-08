import {
  BaseJamCodecable,
  JamCodecable,
  codec,
  eSubIntCodec,
  xBytesCodec,
} from "@tsjam/codec";
import type { HeaderHash, StateKey, u32 } from "@tsjam/types";

/**
 * CE 129
 */
@JamCodecable()
export class StateRequest extends BaseJamCodecable {
  @codec(xBytesCodec(32), "header_hash")
  headerHash!: HeaderHash;

  @codec(xBytesCodec(31), "start_key")
  startKey!: StateKey;

  @codec(xBytesCodec(31), "end_key")
  endKey!: StateKey;

  @eSubIntCodec(4)
  maxSize!: u32;
}
