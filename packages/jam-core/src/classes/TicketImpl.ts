import {
  BaseJamCodecable,
  eIntCodec,
  hashCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Hash, Ticket } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

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
  @hashCodec()
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
}
