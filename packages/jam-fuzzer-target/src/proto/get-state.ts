import {
  BaseJamCodecable,
  JamCodecable,
  SINGLE_ELEMENT_CLASS,
  codec,
  xBytesCodec,
} from "@tsjam/codec";
import { HeaderHash } from "@tsjam/types";

@JamCodecable()
export class GetState extends BaseJamCodecable {
  @codec(xBytesCodec(32), SINGLE_ELEMENT_CLASS)
  headerHash!: HeaderHash;

  constructor(config?: Partial<GetState>) {
    super();
    if (config) {
      Object.assign(this, config);
    }
  }
}
