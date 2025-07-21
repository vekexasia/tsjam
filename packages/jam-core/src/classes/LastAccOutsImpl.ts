import {
  BaseJamCodecable,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { Hash, LastAccOuts, ServiceIndex } from "@tsjam/types";

@JamCodecable()
export class SingleAccOutImpl extends BaseJamCodecable {
  @eSubIntCodec(4)
  serviceIndex!: ServiceIndex;
  @hashCodec()
  accumulationResult!: Hash;
}
/**
 * `θ` - `\lastaccout`
 * $(0.7.0 - 7.4)
 *
 * Codec is C(16) in $(0.7.0 - D.2)
 */
@JamCodecable()
export class LastAccOutsImpl extends BaseJamCodecable implements LastAccOuts {
  @lengthDiscriminatedCodec(SingleAccOutImpl, SINGLE_ELEMENT_CLASS)
  elements!: Array<SingleAccOutImpl>;
}
