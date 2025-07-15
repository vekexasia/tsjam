import {
  JamCodecable,
  BaseJamCodecable,
  fixedSizeIdentityCodec,
  numberCodec,
  bigintCodec,
  binaryCodec,
  jsonCodec,
  BufferJSONCodec,
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
  @numberCodec(4)
  source!: ServiceIndex;

  @numberCodec(4)
  destination!: ServiceIndex;

  @bigintCodec(8)
  amount!: Balance;

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE))
  memo!: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;

  @bigintCodec(8)
  gas!: Gas;
}
