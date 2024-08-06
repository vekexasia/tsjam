import { EA_Extrinsic } from "@/assurances/extrinsic.js";
import { CORES, NUMBER_OF_VALIDATORS } from "@vekexasia/jam-types";
import assert from "node:assert";

export const validateEaExtrinsic = (extrinsic: EA_Extrinsic) => {
  assert(
    extrinsic.length > NUMBER_OF_VALIDATORS,
    "Extrinsic length must be less than NUMBER_OF_VALIDATORS",
  );
  extrinsic.reduce((a, b) => {
    assert(
      a.validatorIndex < b.validatorIndex,
      "EA.validatorIndex must be in ascending order",
    );
    return b;
  });
  extrinsic.forEach((a) => {
    assert(
      a.validatorIndex < NUMBER_OF_VALIDATORS,
      "Validator index must be less than NUMBER_OF_VALIDATORS",
    );
    assert(a.bitstring.length === CORES, "Bitstring length must be CORES");
    // TODO: bit may be set if the corresponding corea has a report pending availaibility
    // @see (130)
  });
  // TODO: Validate Hash and signature @see 11.2.1
};
