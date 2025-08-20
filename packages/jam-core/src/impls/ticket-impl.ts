import { HashCodec } from "@/codecs/misc-codecs";
import { BaseJamCodecable, codec, eIntCodec, JamCodecable } from "@tsjam/codec";
import type { Hash, Ticket } from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

/**
 * identified by `T` set
 * $(0.7.1 - 6.6)
 * $(0.7.1 - C.30) | codec
 */
@JamCodecable()
export class TicketImpl extends BaseJamCodecable implements Ticket {
  /**
   * `y`
   */
  @codec(HashCodec)
  id!: Hash;
  /**
   * `e`
   */
  @eIntCodec()
  attempt!: 0 | 1;

  constructor(config: ConditionalExcept<TicketImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  static newEmpty(): TicketImpl {
    return new TicketImpl({ id: <Hash>new Uint8Array(32).fill(0), attempt: 0 });
  }
}
