import { BaseJamCodecable, eSubIntCodec, JamCodecable } from "@tsjam/codec";
import type { u8 } from "@tsjam/types";

@JamCodecable()
export class Version extends BaseJamCodecable {
  @eSubIntCodec(1)
  major!: u8;
  @eSubIntCodec(1)
  minor!: u8;
  @eSubIntCodec(1)
  patch!: u8;
}
