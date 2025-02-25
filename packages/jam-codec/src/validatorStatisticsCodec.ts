import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { SingleValidatorStatistics, ValidatorStatistics } from "@tsjam/types";
import { createSequenceCodec } from "./sequenceCodec";
import { E_4_int } from "./ints/E_subscr";
import { createCodec } from "./utils";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  JSONCodec,
  NumberJSONCodec,
} from "./json/JsonCodec";

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

type SingleValidatorJSONStatistics = {
  blocks: number;
  tickets: number;
  pre_images: number;
  pre_images_size: number;
  guarantees: number;
  assurances: number;
};
const SingleValStatisticJSONCodec: JSONCodec<
  SingleValidatorStatistics,
  SingleValidatorJSONStatistics
> = createJSONCodec([
  ["blocksProduced", "blocks", NumberJSONCodec()],
  ["ticketsIntroduced", "tickets", NumberJSONCodec()],
  ["preimagesIntroduced", "pre_images", NumberJSONCodec()],
  ["totalOctetsIntroduced", "pre_images_size", NumberJSONCodec()],
  ["guaranteedReports", "guarantees", NumberJSONCodec()],
  ["availabilityAssurances", "assurances", NumberJSONCodec()],
]);

export const ValidatorStatistcsJSONCodec: JSONCodec<
  ValidatorStatistics,
  {
    current: SingleValidatorJSONStatistics[];
    last: SingleValidatorStatistics[];
  }
> = {
  fromJSON(json) {
    const seqofvalstats = ArrayOfJSONCodec(SingleValStatisticJSONCodec);
    return <ValidatorStatistics>[
      seqofvalstats.fromJSON(json.current),
      seqofvalstats.fromJSON(json.last),
    ];
  },
  toJSON(value) {
    const seqofvalstats = ArrayOfJSONCodec(SingleValStatisticJSONCodec);
    return {
      last: seqofvalstats.toJSON(value[0]),
      current: seqofvalstats.toJSON(value[1]),
    };
  },
};
