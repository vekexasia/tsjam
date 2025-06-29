import {
  BoundedSeq,
  ED25519Signature,
  UpToSeq,
  ValidatorIndex,
} from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { Tau } from "@/Tau";
import { CORES } from "@tsjam/constants";

/**
 * Report of newly completed workload whose accuracy is guaranteed by specific validators.
 */
type SingleWorkReportGuarantee = {
  /**
   * `bold_r`
   * the `.coreIndex` of this workload must be unique within
   * the full extrinsic
   */
  workReport: WorkReport;

  /**
   * `t`
   */
  timeSlot: Tau;

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
 * $(0.7.0 - 11.23)
 *
 */
export type EG_Extrinsic = UpToSeq<SingleWorkReportGuarantee, typeof CORES>;
