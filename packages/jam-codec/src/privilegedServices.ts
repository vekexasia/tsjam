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
): JamCodec<PrivilegedServices["assigners"]> => {
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
    ["assigners", privilegedAssignCodec(cores)],
    ["delegator", E_sub_int<ServiceIndex>(4)],
    [
      "alwaysAccers",
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
    manager: number;
    assigners: number[];
    delegator: number;
    alwaysAccers: null | Record<ServiceIndex, number>;
  }
> = createJSONCodec([
  ["manager", "manager", NumberJSONCodec<ServiceIndex>()],
  [
    "assigners",
    "assigners",
    ArrayOfJSONCodec<PrivilegedServices["assigners"], ServiceIndex, number>(
      NumberJSONCodec(),
    ),
  ],
  ["delegator", "delegator", NumberJSONCodec<ServiceIndex>()],
  [
    "alwaysAccers",
    "alwaysAccers",
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
