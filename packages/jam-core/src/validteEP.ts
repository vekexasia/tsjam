import { Hashing } from "@tsjam/crypto";
import { preimageSolicitedButNotYetProvided } from "@tsjam/serviceaccounts";
import { Delta, EP_Extrinsic, Validated } from "@tsjam/types";
import { Result, err, ok } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";

export enum EPError {
  VALIDATION_ERROR = "EP Validation Error",
  PREIMAGE_PROVIDED_OR_UNSOLICITED = "Preimage Provided or unsolicied",
  PREIMAGES_NOT_SORTED = "preimages should be sorted",
}

export const validateEP = (
  extrinsic: EP_Extrinsic,
  deps: {
    delta: Delta;
  },
): Result<Validated<EP_Extrinsic>, EPError> => {
  for (const { serviceIndex } of extrinsic) {
    if (serviceIndex < 0 || serviceIndex >= 2 ** 32) {
      return err(EPError.VALIDATION_ERROR);
    }
  }

  // $(0.7.0 - 12.39)
  for (let i = 1; i < extrinsic.length; i++) {
    const prev = extrinsic[i - 1];
    if (prev.serviceIndex > extrinsic[i].serviceIndex) {
      return err(EPError.PREIMAGES_NOT_SORTED);
    } else if (prev.serviceIndex === extrinsic[i].serviceIndex) {
      const comparisonResult = compareUint8Arrays(
        prev.preimage,
        extrinsic[i].preimage,
      );
      if (comparisonResult !== -1) {
        return err(EPError.PREIMAGES_NOT_SORTED);
      }
    }
  }
  // $(0.7.0 - 12.40) data must be solicited by a service but not yet provided
  for (const { serviceIndex, preimage } of extrinsic) {
    if (
      !preimageSolicitedButNotYetProvided(
        deps.delta,
        serviceIndex,
        Hashing.blake2b(preimage),
        preimage.length,
      )
    ) {
      return err(EPError.PREIMAGE_PROVIDED_OR_UNSOLICITED);
    }
  }

  return ok(<Validated<EP_Extrinsic>>extrinsic);
};
