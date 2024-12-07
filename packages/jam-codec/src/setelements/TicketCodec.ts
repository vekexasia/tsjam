import { Ticket } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import { createCodec, mapCodec } from "@/utils";

/**
 * `C` set member codec
 */
export const TicketCodec = createCodec<Ticket>([
  ["identifier", HashCodec],
  [
    "entryIndex",
    mapCodec(
      E,
      (b) => Number(b) as 0 | 1,
      (n) => BigInt(n),
    ),
  ],
]);
