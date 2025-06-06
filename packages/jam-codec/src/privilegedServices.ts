import { Gas, PrivilegedServices, ServiceIndex } from "@tsjam/types";
import { JamCodec } from "./codec";
import { createCodec } from "./utils";
import { E_sub, E_sub_int } from "./ints/E_subscr";
import { buildGenericKeyValueCodec } from "./dicts/keyValue";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  JSONCodec,
  NumberJSONCodec,
} from "./json/JsonCodec";
import { createSequenceCodec } from "./sequenceCodec";
import { CORES } from "@tsjam/constants";

export const privilegedAssignCodec = (
  cores: typeof CORES,
): JamCodec<PrivilegedServices["assign"]> => {
  return createSequenceCodec(cores, E_sub_int<ServiceIndex>(4));
};
/**
 * Codec for PrivilegedServices
 * being used in merklization and tests
 */
export const PrivilegedServicesCodec = (
  cores: typeof CORES,
): JamCodec<PrivilegedServices> =>
  createCodec([
    ["manager", E_sub_int<ServiceIndex>(4)],
    ["assign", privilegedAssignCodec(cores)],
    ["designate", E_sub_int<ServiceIndex>(4)],
    [
      "alwaysAccumulate",
      buildGenericKeyValueCodec(
        E_sub_int<ServiceIndex>(4),
        E_sub<Gas>(8),
        (a, b) => a - b,
      ),
    ],
  ]);

export const PrivilegedServicesJSONCodec: JSONCodec<
  PrivilegedServices,
  {
    chi_m: number;
    chi_a: number;
    chi_v: number;
    chi_g: null | Record<ServiceIndex, number>;
  }
> = createJSONCodec([
  ["manager", "chi_m", NumberJSONCodec<ServiceIndex>()],
  [
    "assign",
    "chi_a",
    ArrayOfJSONCodec<PrivilegedServices["assign"], ServiceIndex, number>(
      NumberJSONCodec(),
    ),
  ],
  ["designate", "chi_v", NumberJSONCodec<ServiceIndex>()],
  [
    "alwaysAccumulate",
    "chi_g",
    {
      fromJSON(j) {
        if (j === null) {
          return new Map();
        }
        return new Map(
          Object.entries(j).map((a) => [
            <ServiceIndex>Number(a[0]),
            <Gas>BigInt(<number>a[1]),
          ]),
        );
      },
      toJSON(v: Map<ServiceIndex, Gas>) {
        if (v.size === 0) {
          return {};
        }
        return Object.fromEntries(
          [...v.entries()].map((a) => [a[0], Number(a[1])]),
        );
      },
    },
  ],
]);
