import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { SingleValidatorStatistics, ValidatorStatistics } from "@tsjam/types";
import { createSequenceCodec } from "./sequenceCodec";
import { E_4_int } from "./ints/E_subscr";
import { createCodec } from "./utils";

/**
 * Codec For `ValidatorStatistics`.
 * there is no direct formalism in graypaper. just a series of formulas on
 * identities and sequences encoding/decoding
 */
export const ValidatorStatisticsCodec = (
  validatorsCount: typeof NUMBER_OF_VALIDATORS,
) =>
  createSequenceCodec<ValidatorStatistics>(
    2,
    createSequenceCodec<ValidatorStatistics[0]>(
      validatorsCount,
      createCodec<SingleValidatorStatistics>([
        ["blocksProduced", E_4_int],
        ["ticketsIntroduced", E_4_int],
        ["preimagesIntroduced", E_4_int],
        ["totalOctetsIntroduced", E_4_int],
        ["guaranteedReports", E_4_int],
        ["availabilityAssurances", E_4_int],
      ]),
    ),
  );
