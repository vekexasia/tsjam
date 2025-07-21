import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Delta, ServiceAccount, ServiceIndex } from "@tsjam/types";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.0 - 9.2)
 */
@JamCodecable()
export class DeltaImpl extends BaseJamCodecable implements Delta {
  elements!: Map<ServiceIndex, ServiceAccount>;
}
