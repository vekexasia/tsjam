import {
  JamCodecable,
  BaseJamCodecable,
  hashCodec,
  sequenceCodec,
  createCodec,
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  createJSONCodec,
  BandersnatchKeyJSONCodec,
  Ed25519PublicKeyJSONCodec,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  EpochMarker,
  Blake2bHash,
  SeqOfLength,
  BandersnatchKey,
  ED25519PublicKey,
} from "@tsjam/types";

/**
 * $(0.7.1 - 5.10)
 */
@JamCodecable()
export class HeaderEpochMarkerImpl
  extends BaseJamCodecable
  implements EpochMarker
{
  @hashCodec()
  entropy!: Blake2bHash;

  @hashCodec("tickets_entropy")
  entropy2!: Blake2bHash;
  @sequenceCodec(NUMBER_OF_VALIDATORS, <any>{
    ...createCodec([
      ["bandersnatch", BandersnatchCodec],
      ["ed25519", Ed25519PubkeyCodec],
    ]),
    ...createJSONCodec<any>([
      ["bandersnatch", "bandersnatch", BandersnatchKeyJSONCodec],
      ["ed25519", "ed25519", Ed25519PublicKeyJSONCodec],
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
