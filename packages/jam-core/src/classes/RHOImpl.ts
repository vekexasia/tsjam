import {
  BaseJamCodecable,
  codec,
  eSubIntCodec,
  JamCodec,
  JamCodecable,
  JSONCodec,
  NULLORCodec,
  Optional,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { CORES } from "@tsjam/constants";
import { RHO, RHOElement, SeqOfLength, Tau } from "@tsjam/types";
import { WorkReportImpl } from "./WorkReportImpl";

@JamCodecable()
export class RHOElementImpl extends BaseJamCodecable implements RHOElement {
  /** `bold_r`
   */
  @codec(WorkReportImpl)
  workReport!: WorkReportImpl;
  /**
   * `t`
   */
  @eSubIntCodec(4)
  reportTime!: Tau;
}

@JamCodecable()
export class RHOImpl extends BaseJamCodecable implements RHO {
  @sequenceCodec(
    CORES,
    {
      ...(<JamCodec<RHOElementImpl | undefined>>new Optional(RHOElementImpl)),
      ...NULLORCodec(<JSONCodec<RHOElementImpl>>RHOElementImpl),
    },
    SINGLE_ELEMENT_CLASS,
  )
  elements!: SeqOfLength<RHOElementImpl | undefined, typeof CORES>;
}
