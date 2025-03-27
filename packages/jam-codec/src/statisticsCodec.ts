import {
  Gas,
  JamStatistics,
  ServiceIndex,
  SingleCoreStatistics,
  SingleServiceStatistics,
  u32,
} from "@tsjam/types";
import { createCodec } from "./utils";
import { ValidatorStatisticsCodec } from "./validatorStatisticsCodec";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { createSequenceCodec } from "./sequenceCodec";
import { E_2_int, E_4_int, E_sub, E_sub_int } from "./ints/E_subscr";
import { buildGenericKeyValueCodec } from "./dicts/keyValue";
import { JamCodec } from "./codec";

const coreStatisticsCodec = (cores: typeof CORES) => {
  return createSequenceCodec(
    cores,
    createCodec<SingleCoreStatistics>([
      ["daLoad", E_4_int],
      ["popularity", E_2_int],
      ["imports", E_2_int],
      ["extrinsicCount", E_2_int],
      ["extrinsicSize", E_4_int],
      ["exports", E_2_int],
      ["bundleSize", E_4_int],
      ["usedGas", E_sub<Gas>(8)],
    ]),
  );
};

export const serviceStatisticsCodec = buildGenericKeyValueCodec(
  E_sub_int<ServiceIndex>(4),
  createCodec<SingleServiceStatistics>([
    [
      "provided",
      createCodec<SingleServiceStatistics["provided"]>([
        ["count", E_2_int],
        ["size", E_4_int],
      ]),
    ],
    [
      "refinement",
      createCodec<SingleServiceStatistics["refinement"]>([
        ["count", E_4_int],
        ["usedGas", E_sub<Gas>(8)],
      ]),
    ],
    ["imports", E_2_int],
    ["extrinsicCount", E_2_int],
    ["extrinsicSize", E_4_int],
    ["exports", E_2_int],
    [
      "accumulate",
      createCodec<SingleServiceStatistics["accumulate"]>([
        ["count", E_4_int],
        ["usedGas", E_sub<Gas>(8)],
      ]),
    ],
    [
      "transfers",
      createCodec<SingleServiceStatistics["accumulate"]>([
        ["count", E_4_int],
        ["usedGas", E_sub<Gas>(8)],
      ]),
    ],
  ]),
  (a, b) => a - b,
);

export const StatisticsCodec = (
  validatorsCount: typeof NUMBER_OF_VALIDATORS,
  cores: typeof CORES,
): JamCodec<JamStatistics> => {
  return createCodec([
    ["validator", ValidatorStatisticsCodec(validatorsCount)],
    ["core", coreStatisticsCodec(cores)],
    ["service", serviceStatisticsCodec],
  ]);
};
