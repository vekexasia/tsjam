import { encodeWithCodec, WorkReportCodec } from "@tsjam/codec";
import { CORES } from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  AuditRequiredWorkReports,
  AvailableWorkReports,
  RHO,
} from "@tsjam/types";

/**
 * Comutes `bold Q` in thye paper which is the sequence of work reports which may be required
 * to be audited by the validator
 * $(0.5.4 - 17.2)
 */
export const computeRequiredWorkReports = (
  rho: RHO,
  bold_w: AvailableWorkReports,
): AuditRequiredWorkReports => {
  const toRet = [] as unknown[] as AuditRequiredWorkReports;

  const wSet = new Set(
    bold_w.map((wr) => Hashing.blake2b(encodeWithCodec(WorkReportCodec, wr))),
  );

  for (let c = 0; c < CORES; c++) {
    const rc = rho[c];
    if (
      rc &&
      wSet.has(Hashing.blake2b(encodeWithCodec(WorkReportCodec, rc.workReport)))
    ) {
      toRet.push(rc.workReport);
    } else {
      toRet.push(undefined);
    }
  }
  return toRet;
};
