import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  binaryCodec,
  codec,
  createArrayLengthDiscriminator,
  createSequenceCodec,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedSetCodec,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { AccumulationQueue, SeqOfLength, WorkPackageHash } from "@tsjam/types";
import { WorkReportImpl } from "./WorkReportImpl";

@JamCodecable()
export class AccumulationQueueItem extends BaseJamCodecable {
  /**
   * `bold_r`
   */
  @codec(WorkReportImpl)
  workReport!: WorkReportImpl;
  /**
   * `bold_d`
   * the unaccumulated dependencies of the workreport
   */
  @lengthDiscriminatedSetCodec({ ...HashCodec, ...HashJSONCodec() })
  dependencies!: Set<WorkPackageHash>;
}

export class AccumulationQueueImpl
  extends BaseJamCodecable
  implements AccumulationQueue
{
  @sequenceCodec(
    EPOCH_LENGTH,
    {
      ...createArrayLengthDiscriminator(AccumulationQueueItem),
      ...ArrayOfJSONCodec(AccumulationQueueItem),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<Array<AccumulationQueueItem>, typeof EPOCH_LENGTH>;
}
