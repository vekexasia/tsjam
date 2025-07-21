import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  createArrayLengthDiscriminator,
  HashCodec,
  HashJSONCodec,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { AUTHPOOL_SIZE, CORES } from "@tsjam/constants";
import { AuthorizerPool, Hash, SeqOfLength, UpToSeq } from "@tsjam/types";

export class AuthorizerPoolImpl
  extends BaseJamCodecable
  implements AuthorizerPool
{
  @sequenceCodec(
    CORES,
    {
      ...createArrayLengthDiscriminator(HashCodec),
      ...ArrayOfJSONCodec(HashJSONCodec()),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<UpToSeq<Hash, typeof AUTHPOOL_SIZE>, typeof CORES>;
}
