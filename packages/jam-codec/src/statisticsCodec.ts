import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Gas,
  JamStatistics,
  ServiceIndex,
  SingleCoreStatistics,
  SingleServiceStatistics,
  SingleValidatorStatistics,
  u16,
  u32,
  ValidatorStatistics,
} from "@tsjam/types";
import { JamCodec } from "./codec";
import { buildGenericKeyValueCodec } from "./dicts/keyValue";
import { E_bigint, E_int } from "./ints/e";
import { E_4_int, E_sub, E_sub_int } from "./ints/E_subscr";
import {
  ArrayOfJSONCodec,
  BigIntJSONCodec,
  createJSONCodec,
  JSONCodec,
  MapJSONCodec,
  NumberJSONCodec,
} from "./json/JsonCodec";
import { createSequenceCodec } from "./sequenceCodec";
import { createCodec } from "./utils";
export const StatisticsCodec = (
  validatorsCount: typeof NUMBER_OF_VALIDATORS,
  cores: typeof CORES,
): JamCodec<JamStatistics> => {
  return createCodec([
    ["validators", ValidatorStatisticsCodec(validatorsCount)],
    ["cores", coreStatisticsCodec(cores)],
    ["services", ServiceStatisticsCodec],
  ]);
};

export const StatisticsJSONCodec: JSONCodec<
  JamStatistics,
  {
    vals_current: SingleValidatorJSONStatistics[];
    vals_last: SingleValidatorJSONStatistics[];
    cores: SingleCoreJSONStatistics[];
    services: Array<{ id: number; record: SingleServiceJSONStatistics }>;
  }
> = {
  fromJSON(json) {
    return <JamStatistics>{
      validators: ValidatorStatistcsJSONCodec.fromJSON(json),
      cores: ArrayOfJSONCodec(coreStatisticsJSONCodec).fromJSON(json.cores),
      services: MapJSONCodec(
        {
          key: "id",
          value: "record",
        },
        NumberJSONCodec<ServiceIndex>(),
        ServiceStatisticsJSONCodec,
      ).fromJSON(json.services || []),
    };
  },
  toJSON(value: JamStatistics) {
    const seqofvalstats = ArrayOfJSONCodec(SingleValStatisticJSONCodec);
    return {
      vals_current: seqofvalstats.toJSON(value.validators[0]),
      vals_last: seqofvalstats.toJSON(value.validators[1]),
      cores: ArrayOfJSONCodec(coreStatisticsJSONCodec).toJSON(value.cores),
      services: MapJSONCodec(
        {
          key: "id",
          value: "record",
        },
        NumberJSONCodec<ServiceIndex>(),
        ServiceStatisticsJSONCodec,
      ).toJSON(value.services),
    };
  },
};

const coreStatisticsCodec = (cores: typeof CORES) => {
  return createSequenceCodec(
    cores,
    createCodec<SingleCoreStatistics>([
      ["daLoad", E_int<u32>()],
      ["popularity", E_int<u16>()],
      ["importCount", E_int<u16>()],
      ["exportCount", E_int<u16>()],
      ["extrinsicSize", E_int<u32>()],
      ["extrinsicCount", E_int<u16>()],
      ["bundleSize", E_int<u32>()],
      ["gasUsed", E_bigint<Gas>()],
    ]),
  );
};
type SingleCoreJSONStatistics = {
  gas_used: number;
  imports: number;
  extrinsic_count: number;
  extrinsic_size: number;
  exports: number;
  bundle_size: number;
  popularity: number;
  da_load: number;
};
const coreStatisticsJSONCodec = createJSONCodec<
  SingleCoreStatistics,
  SingleCoreJSONStatistics
>([
  ["gasUsed", "gas_used", BigIntJSONCodec<Gas>()],
  ["importCount", "imports", NumberJSONCodec<u16>()],
  ["extrinsicCount", "extrinsic_count", NumberJSONCodec<u16>()],
  ["extrinsicSize", "extrinsic_size", NumberJSONCodec<u32>()],
  ["exportCount", "exports", NumberJSONCodec<u16>()],
  ["bundleSize", "bundle_size", NumberJSONCodec<u32>()],
  ["daLoad", "da_load", NumberJSONCodec<u32>()],
  ["popularity", "popularity", NumberJSONCodec<u16>()],
]);

export const ServiceStatisticsCodec = buildGenericKeyValueCodec(
  E_sub_int<ServiceIndex>(4),
  createCodec<SingleServiceStatistics>([
    [
      "provided",
      createCodec<SingleServiceStatistics["provided"]>([
        ["count", E_int<u16>()],
        ["size", E_int<u32>()],
      ]),
    ],
    [
      "refinement",
      createCodec<SingleServiceStatistics["refinement"]>([
        ["count", E_int<u32>()],
        ["gasUsed", E_sub<Gas>(8)],
      ]),
    ],
    ["importCount", E_int<u32>()],
    ["exportCount", E_int<u32>()],
    ["extrinsicSize", E_int<u32>()],
    ["extrinsicCount", E_int<u32>()],
    [
      "accumulate",
      createCodec<SingleServiceStatistics["accumulate"]>([
        ["count", E_int<u32>()],
        ["gasUsed", E_sub<Gas>(8)],
      ]),
    ],
    [
      "transfers",
      createCodec<SingleServiceStatistics["transfers"]>([
        ["count", E_int<u32>()],
        ["gasUsed", E_sub<Gas>(8)],
      ]),
    ],
  ]),
  (a, b) => a - b,
);

type SingleServiceJSONStatistics = {
  provided_count: number;
  provided_size: number;
  refinement_count: number;
  refinement_gas_used: number;
  imports: number;
  extrinsic_count: number;
  extrinsic_size: number;
  exports: number;
  accumulate_count: number;
  accumulate_gas_used: number;
  on_transfers_count: number;
  on_transfers_gas_used: number;
};
export const ServiceStatisticsJSONCodec: JSONCodec<
  SingleServiceStatistics,
  SingleServiceJSONStatistics
> = {
  fromJSON(json) {
    return {
      provided: {
        count: <u16>json.provided_count,
        size: <u32>json.provided_size,
      },
      refinement: {
        count: <u32>json.refinement_count,
        gasUsed: BigInt(json.refinement_gas_used) as Gas,
      },
      importCount: <u32>json.imports,
      extrinsicCount: <u32>json.extrinsic_count,
      extrinsicSize: <u32>json.extrinsic_size,
      exportCount: <u32>json.exports,
      accumulate: {
        count: <u32>json.accumulate_count,
        gasUsed: BigInt(json.accumulate_gas_used) as Gas,
      },
      transfers: {
        count: <u32>json.on_transfers_count,
        gasUsed: BigInt(json.on_transfers_gas_used) as Gas,
      },
    };
  },
  toJSON(value) {
    return {
      provided_count: value.provided.count,
      provided_size: value.provided.size,
      refinement_count: value.refinement.count,
      refinement_gas_used: Number(value.refinement.gasUsed),
      imports: value.importCount,
      extrinsic_count: value.extrinsicCount,
      extrinsic_size: value.extrinsicSize,
      exports: value.exportCount,
      accumulate_count: value.accumulate.count,
      accumulate_gas_used: Number(value.accumulate.gasUsed),
      on_transfers_count: value.transfers.count,
      on_transfers_gas_used: Number(value.transfers.gasUsed),
    };
  },
};
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
    vals_current: SingleValidatorJSONStatistics[];
    vals_last: SingleValidatorJSONStatistics[];
  }
> = {
  fromJSON(json) {
    const seqofvalstats = ArrayOfJSONCodec(SingleValStatisticJSONCodec);
    return <ValidatorStatistics>[
      seqofvalstats.fromJSON(json.vals_current),
      seqofvalstats.fromJSON(json.vals_last),
    ];
  },
  toJSON(value) {
    const seqofvalstats = ArrayOfJSONCodec(SingleValStatisticJSONCodec);
    return {
      vals_current: seqofvalstats.toJSON(value[0]),
      vals_last: seqofvalstats.toJSON(value[1]),
    };
  },
};
