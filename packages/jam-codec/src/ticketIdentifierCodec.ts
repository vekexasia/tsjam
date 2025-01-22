import { TicketIdentifier } from "@tsjam/types";
import { OpaqueHashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import { createCodec, mapCodec } from "./utils";

/**
 * $(0.5.4 - C.27)
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
