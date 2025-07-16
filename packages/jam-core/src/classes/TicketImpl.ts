import {
  BaseJamCodecable,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Hash, Ticket } from "@tsjam/types";

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
  @eSubIntCodec(1)
  attempt!: 0 | 1;
}
