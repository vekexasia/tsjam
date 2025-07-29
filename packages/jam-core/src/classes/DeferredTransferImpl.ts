import {
  JamCodecable,
  BaseJamCodecable,
  fixedSizeIdentityCodec,
  binaryCodec,
  jsonCodec,
  BufferJSONCodec,
  eSubIntCodec,
  eSubBigIntCodec,
} from "@tsjam/codec";
import { TRANSFER_MEMO_SIZE } from "@tsjam/constants";
import {
  Balance,
  ByteArrayOfLength,
  DeferredTransfer,
  Gas,
  ServiceIndex,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

/**
 * `X` set in graypaper
 * $(0.7.0 - 12.14)
 */
@JamCodecable()
export class DeferredTransferImpl
  extends BaseJamCodecable
  implements DeferredTransfer
{
  /**
   * `s`
   */
  @eSubIntCodec(4)
  source!: ServiceIndex;

  /**
   * `d`
   */
  @eSubIntCodec(4)
  destination!: ServiceIndex;

  /**
   * `a`
   */
  @eSubBigIntCodec(8)
  amount!: Balance;

  /**
   * `m`
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE))
  memo!: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;

  /**
   * `g`
   */
  @eSubBigIntCodec(8)
  gas!: Gas;

  constructor(config?: ConditionalExcept<DeferredTransferImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
