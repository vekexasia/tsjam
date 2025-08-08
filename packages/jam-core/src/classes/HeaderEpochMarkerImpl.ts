import { HashCodec, xBytesCodec } from "@/codecs/miscCodecs";
import {
  BaseJamCodecable,
  codec,
  createCodec,
  createJSONCodec,
  JamCodecable,
  sequenceCodec,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BandersnatchKey,
  Blake2bHash,
  ED25519PublicKey,
  EpochMarker,
  SeqOfLength,
} from "@tsjam/types";

/**
 * $(0.7.1 - 5.10)
 */
@JamCodecable()
export class HeaderEpochMarkerImpl
  extends BaseJamCodecable
  implements EpochMarker
{
  @codec(HashCodec)
  entropy!: Blake2bHash;

  @codec(HashCodec, "tickets_entropy")
  entropy2!: Blake2bHash;
  @sequenceCodec(NUMBER_OF_VALIDATORS, <any>{
    ...createCodec([
      ["bandersnatch", xBytesCodec<any, 32>(32)],
      ["ed25519", xBytesCodec<any, 32>(32)],
    ]),
    ...createJSONCodec<any>([
      ["bandersnatch", "bandersnatch", xBytesCodec<any, 32>(32)],
      ["ed25519", "ed25519", xBytesCodec<any, 32>(32)],
    ]),
  })
  validators!: SeqOfLength<
    {
      bandersnatch: BandersnatchKey;
      ed25519: ED25519PublicKey;
    },
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;
}
