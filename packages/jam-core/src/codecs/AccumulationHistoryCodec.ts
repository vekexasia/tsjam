import { JamCodec } from "@/codec";
import { WorkPackageHashCodec } from "@/identity";
import {
  ArrayOfJSONCodec,
  HashJSONCodec,
  JSONCodec,
  SetJSONCodec,
  ZipJSONCodecs,
} from "@/json/JsonCodec";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { createSequenceCodec } from "@/sequenceCodec";
import { mapCodec } from "@/utils";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { AccumulationHistory } from "@tsjam/types";

/**
 * Used in tests
 * AccumulatedQueue | AccumulationHistory in our code
 */
export const AccumulationHistoryCodec = (
  epochLength: typeof EPOCH_LENGTH,
): JamCodec<AccumulationHistory> => {
  return createSequenceCodec(
    epochLength,
    mapCodec(
      createArrayLengthDiscriminator(WorkPackageHashCodec),
      (v) => new Set(v),
      (s) => [...s.values()],
    ),
  );
};

export const AccumulationHistoryJSONCodec: JSONCodec<
  AccumulationHistory,
  string[][]
> = ArrayOfJSONCodec(
  ZipJSONCodecs(ArrayOfJSONCodec(HashJSONCodec()), SetJSONCodec()),
);
