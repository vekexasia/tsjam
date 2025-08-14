import { BaseJamCodecable, JamCodecable, codec } from "@tsjam/codec";
import { JamSignedHeaderImpl } from "@tsjam/core";
import { State } from "./state";

/**
 * SetState ::= SEQUENCE {
 *   header Header,
 *   state  State
 * }
 *
 * State ::= SEQUENCE OF KeyValue
 */
@JamCodecable()
export class SetState extends BaseJamCodecable {
  @codec(JamSignedHeaderImpl)
  header!: JamSignedHeaderImpl;

  @codec(State)
  state!: State;
}
