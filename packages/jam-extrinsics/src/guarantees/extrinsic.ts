import {
  BoundedSeq,
  CORES,
  ED25519Signature,
  u32,
  UpToSeq,
  ValidatorIndex,
  WorkReport,
} from "@vekexasia/jam-types";

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
   * `v`
   * the creds must be ordered by `validatorIndex` (140)
   *
   */
  credential: BoundedSeq<
    {
      validatorIndex: ValidatorIndex;
      signature: ED25519Signature;
    },
    2,
    3
  >;
};
/**
 * Identified by `Eg`.
 * @see section 11.4
 *
 */
export type EG_Extrinsic = UpToSeq<SingleWorkReportGuarantee, typeof CORES>;
