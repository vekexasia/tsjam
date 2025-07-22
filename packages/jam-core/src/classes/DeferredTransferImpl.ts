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

@JamCodecable()
export class DeferredTransferImpl
  extends BaseJamCodecable
  implements DeferredTransfer
{
  @eSubIntCodec(4)
  source!: ServiceIndex;

  @eSubIntCodec(4)
  destination!: ServiceIndex;

  @eSubBigIntCodec(8)
  amount!: Balance;

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE))
  memo!: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;

  @eSubBigIntCodec(8)
  gas!: Gas;
}
