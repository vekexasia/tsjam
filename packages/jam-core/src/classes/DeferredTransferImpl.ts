import {
  JamCodecable,
  BaseJamCodecable,
  JamProperty,
  E_4_int,
  E_8,
  fixedSizeIdentityCodec,
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
  extends BaseJamCodecable<DeferredTransferImpl>
  implements DeferredTransfer
{
  @JamProperty(E_4_int)
  source!: ServiceIndex;

  @JamProperty(E_4_int)
  destination!: ServiceIndex;

  @JamProperty(E_8)
  amount!: Balance;

  @JamProperty(fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE))
  memo!: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;

  @JamProperty(E_8)
  gas!: Gas;
}
