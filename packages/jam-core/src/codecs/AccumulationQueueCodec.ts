import { JamCodec } from "@/codec";
import { WorkPackageHashCodec } from "@/identity";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  HashJSONCodec,
  SetJSONCodec,
  ZipJSONCodecs,
} from "@/json/JsonCodec";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { createSequenceCodec } from "@/sequenceCodec";
import {
  WorkReportCodec,
  WorkReportJSON,
  WorkReportJSONCodec,
} from "@/setelements/WorkReportCodec";
import { createCodec, mapCodec } from "@/utils";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { AccumulationQueue, WorkPackageHash } from "@tsjam/types";

/**
 * ReadyQueue | AccumulationQueue in our code
 */
export const AccumulationQueueCodec = (
  epochLength: typeof EPOCH_LENGTH, // here to please typescript but any number can be passed
): JamCodec<AccumulationQueue> =>
  createSequenceCodec(
    epochLength,
    createArrayLengthDiscriminator(
      createCodec<AccumulationQueue[0][0]>([
        ["workReport", WorkReportCodec],
        [
          "dependencies",
          mapCodec(
            createArrayLengthDiscriminator(WorkPackageHashCodec),
            (v) => new Set(v),
            (s) => [...s.values()],
          ),
        ],
      ]),
    ),
  );

export const AccumulationQueueJSONCodec = ArrayOfJSONCodec<
  AccumulationQueue,
  AccumulationQueue[0],
  { report: WorkReportJSON; dependencies: string[] }[]
>(
  ArrayOfJSONCodec(
    createJSONCodec([
      ["workReport", "report", WorkReportJSONCodec],
      [
        "dependencies",
        "dependencies",
        ZipJSONCodecs(
          ArrayOfJSONCodec(HashJSONCodec<WorkPackageHash>()),
          SetJSONCodec<Set<WorkPackageHash>, WorkPackageHash>(),
        ),
      ],
    ]),
  ),
);
