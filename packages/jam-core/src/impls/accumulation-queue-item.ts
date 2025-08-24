import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet, identitySetCodec } from "@/data-structures/identity-set";
import { JamCodecable, BaseJamCodecable, codec } from "@tsjam/codec";
import { WorkPackageHash } from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";
import { WorkReportImpl } from "./work-report-impl";

@JamCodecable()
export class AccumulationQueueItem extends BaseJamCodecable {
  /**
   * `bold_r`
   */
  @codec(WorkReportImpl, "report")
  workReport!: WorkReportImpl;
  /**
   * `bold_d`
   * the unaccumulated dependencies of the workreport
   */
  @identitySetCodec(HashCodec)
  dependencies!: IdentitySet<WorkPackageHash>;

  constructor(config: ConditionalExcept<AccumulationQueueItem, Function>) {
    super();
    Object.assign(this, config);
  }
}
