import { Gas, PrivilegedServices, ServiceIndex } from "@tsjam/types";
import { JamCodec } from "./codec";
import { createCodec } from "./utils";
import { E_sub, E_sub_int } from "./ints/E_subscr";
import { buildGenericKeyValueCodec } from "./dicts/keyValue";

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
