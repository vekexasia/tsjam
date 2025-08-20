import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { IdentityMap, IdentityMapCodec } from "@tsjam/core";
import { StateKey } from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

@JamCodecable()
export class State extends BaseJamCodecable {
  @codec(
    IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
      key: "key",
      value: "value",
    }),
    SINGLE_ELEMENT_CLASS,
  )
  value!: IdentityMap<StateKey, 31, Uint8Array>;

  constructor(config?: ConditionalExcept<State, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
