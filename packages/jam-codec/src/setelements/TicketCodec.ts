import { HashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import { Hash, Ticket } from "@tsjam/types";
import {
  createJSONCodec,
  HashJSONCodec,
  NumberJSONCodec,
} from "../json/JsonCodec";
import { createCodec, mapCodec } from "../utils";

/**
 * $(0.6.4 - C.27)
 */
export const TicketCodec = createCodec<Ticket>([
  ["id", HashCodec],
  [
    "attempt",
    mapCodec(
      E,
      (x) => Number(x) as 0 | 1,
      (x) => BigInt(x),
    ),
  ],
]);

export const TicketJSONCodec = createJSONCodec<
  Ticket,
  { id: string; attempt: number }
>([
  ["id", "id", HashJSONCodec<Hash>()],
  ["attempt", "attempt", NumberJSONCodec<0 | 1>()],
]);
