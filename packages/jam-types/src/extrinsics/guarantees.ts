import {
  BoundedSeq,
  ED25519Signature,
  UpToSeq,
  ValidatorIndex,
} from "@/genericTypes";
import { WorkReport } from "@/sets/WorkReport";
import { Tau } from "@/Tau";
import { CORES } from "@tsjam/constants";

export type SingleWorkReportGuaranteeSignature = {
  /**
   * `v`
   */
  validatorIndex: ValidatorIndex;
  /**
   * `s`
   */
  signature: ED25519Signature;
};

/**
 * Report of newly completed workload whose accuracy is guaranteed by specific validators.
 */
export type SingleWorkReportGuarantee = {
  /**
   * `bold_r`
   * the `.coreIndex` of this workload must be unique within
   * the full extrinsic
   */
  report: WorkReport;

  /**
   * `t`
   */
  slot: Tau;

  /**
   * `a`
   * the creds must be ordered by `validatorIndex`
   *
   */
  signatures: BoundedSeq<SingleWorkReportGuaranteeSignature, 2, 3>;
};
/**
 * Identified by `Eg`.
 * @see section 11.4
 * $(0.7.1 - 11.23)
 *
 */
export type EG_Extrinsic = {
  elements: UpToSeq<SingleWorkReportGuarantee, typeof CORES>;
};
