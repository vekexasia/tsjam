import {
  BaseJamCodecable,
  JamCodecable,
  codec,
  lengthDiscriminatedCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { JamSignedHeaderImpl, SlotImpl } from "@tsjam/core";
import { State } from "./state";
import { type HeaderHash } from "@tsjam/types";

@JamCodecable()
export class AncestryItem extends BaseJamCodecable {
  @codec(SlotImpl)
  slot!: SlotImpl;

  @codec(xBytesCodec(32), "header_hash")
  headerHash!: HeaderHash;
}

/**
 * SetState ::= SEQUENCE {
 *   header Header,
 *   state  State
 * }
 *
 * State ::= SEQUENCE OF KeyValue
 */
@JamCodecable()
export class Initialize extends BaseJamCodecable {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(State)
  state!: State;

  @lengthDiscriminatedCodec(AncestryItem)
  ancestry!: AncestryItem[];

  constructor(config?: Partial<Initialize>) {
    super();
    if (config) {
      Object.assign(this, config);
    }
  }
}
