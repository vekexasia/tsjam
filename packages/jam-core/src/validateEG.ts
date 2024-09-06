import { EG_Extrinsic } from "@vekexasia/jam-types";
import assert from "node:assert";
import { CORES } from "@vekexasia/jam-constants";

export const validateEG_Extrinsic = (extrinsic: EG_Extrinsic) => {
  assert(extrinsic.length <= CORES, "Extrinsic length must be less than CORES");
  if (extrinsic.length > 1) {
    assert(
      extrinsic[0].workReport.coreIndex < CORES &&
        extrinsic[0].workReport.coreIndex >= 0,
      "core index not in bounds",
    );
  }
  extrinsic.reduce((acc, next) => {
    assert(
      next.workReport.coreIndex > acc.workReport.coreIndex,
      "core index must be unique and ordered",
    );
    assert(
      next.workReport.coreIndex < CORES && next.workReport.coreIndex >= 0,
      "core index not in bounds",
    );
    return next;
  });

  extrinsic.forEach((ext) => {
    assert(
      ext.credential.length >= 2 && ext.credential.length <= 3,
      "credential length must be between 2 and 3",
    );
    let prev = ext.credential[0];
    for (let i = 1; i < ext.credential.length; i++) {
      const next = ext.credential[i];
      assert(
        next.validatorIndex > prev.validatorIndex,
        "validator index must be unique and ordered",
      );
      prev = next;
    }
    ext.credential.forEach((cred) => {
      assert(
        cred.validatorIndex === 0 || cred.validatorIndex === 1,
        "validator index must be 0 or 1",
      );
    });
  });
};
