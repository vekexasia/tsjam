import { Gas, PrivilegedServices, ServiceIndex } from "@tsjam/types";
import { JamCodec } from "./codec";
import { createCodec } from "./utils";
import { E_sub, E_sub_int } from "./ints/E_subscr";
import { buildGenericKeyValueCodec } from "./dicts/keyValue";
import { createJSONCodec, JSONCodec, NumberJSONCodec } from "./json/JsonCodec";

/**
 * Codec for PrivilegedServices
 * being used in merklization and tests
 */
export const PrivilegedServicesCodec: JamCodec<PrivilegedServices> =
  createCodec([
    ["bless", E_sub_int<ServiceIndex>(4)],
    ["assign", E_sub_int<ServiceIndex>(4)],
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
  ["bless", "chi_m", NumberJSONCodec<ServiceIndex>()],
  ["assign", "chi_a", NumberJSONCodec<ServiceIndex>()],
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
          return null;
        }
        return Object.fromEntries(
          [...v.entries()].map((a) => [a[0], Number(a[1])]),
        );
      },
    },
  ],
]);
