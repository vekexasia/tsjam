import { HashCodec, xBytesCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  codec,
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

@JamCodecable()
export class EpochMarkerValidatorImpl extends BaseJamCodecable {
  @codec(xBytesCodec(32))
  bandersnatch!: BandersnatchKey;
  @codec(xBytesCodec(32))
  ed25519!: ED25519PublicKey;
}

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

  @sequenceCodec(NUMBER_OF_VALIDATORS, EpochMarkerValidatorImpl)
  validators!: SeqOfLength<
    EpochMarkerValidatorImpl,
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;
}
