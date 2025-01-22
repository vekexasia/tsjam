import {
  BoundedSeq,
  ED25519Signature,
  UpToSeq,
  ValidatorIndex,
  u32,
} from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { CORES } from "@tsjam/constants";

/**
 * Report of newly completed workload whose accuracy is guaranteed by specific validators.
 */
type SingleWorkReportGuarantee = {
  /**
   * `w`
   * the `.coreIndex` of this workload must be unique within
   * the full extrinsic
   */
  workReport: WorkReport;

  /**
   * `t`
   */
  timeSlot: u32;

  /**
   * `a`
   * the creds must be ordered by `validatorIndex`
   *
   */
  credential: BoundedSeq<
    {
      /**
       * `v`
       */
      validatorIndex: ValidatorIndex;
      /**
       * `s`
       */
      signature: ED25519Signature;
    },
    2,
    3
  >;
};
/**
 * Identified by `Eg`.
 * @see section 11.4
 * $(0.5.4 - 11.23)
 *
 */
export type EG_Extrinsic = UpToSeq<SingleWorkReportGuarantee, typeof CORES>;
