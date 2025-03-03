import { OpaqueHash, TicketIdentifier } from "@tsjam/types";
import { OpaqueHashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import { createCodec, mapCodec } from "./utils";
import {
  createJSONCodec,
  HashJSONCodec,
  NumberJSONCodec,
} from "./json/JsonCodec";

/**
 * $(0.6.1 - C.27)
 */
export const TicketIdentifierCodec = createCodec<TicketIdentifier>([
  ["id", OpaqueHashCodec],
  [
    "attempt",
    mapCodec(
      E,
      (x) => Number(x) as 0 | 1,
      (x) => BigInt(x),
    ),
  ],
]);

export const TicketIdentifierJSONCodec = createJSONCodec<
  TicketIdentifier,
  { id: string; attempt: number }
>([
  ["id", "id", HashJSONCodec<OpaqueHash>()],
  ["attempt", "attempt", NumberJSONCodec<0 | 1>()],
]);
