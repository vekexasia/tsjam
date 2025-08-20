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
import type {
  Balance,
  ByteArrayOfLength,
  DeferredTransfer,
  Gas,
  ServiceIndex,
} from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

/**
 * `X`
 * $(0.7.1 - 12.14)
 * $(0.7.1 - C.31) | codec
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

  static newEmpty(): DeferredTransferImpl {
    return new DeferredTransferImpl({
      source: <ServiceIndex>0,
      destination: <ServiceIndex>0,
      amount: <Balance>0n,
      memo: <ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>>(
        new Uint8Array(TRANSFER_MEMO_SIZE).fill(0)
      ),
      gas: <Gas>0n,
    });
  }
}
