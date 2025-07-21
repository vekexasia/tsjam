import {
  BaseJamCodecable,
  createLengthDiscrimantedSetCodec,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  sequenceCodec,
  SetJSONCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  AccumulationHistory,
  SeqOfLength,
  WorkPackageHash,
} from "@tsjam/types";

@JamCodecable()
export class AccumulationHistoryImpl
  extends BaseJamCodecable
  implements AccumulationHistory
{
  @sequenceCodec(
    EPOCH_LENGTH,
    {
      ...createLengthDiscrimantedSetCodec(HashCodec),

      ...SetJSONCodec(HashJSONCodec()),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<Set<WorkPackageHash>, typeof EPOCH_LENGTH>;
}
