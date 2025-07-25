import { BaseJamCodecable } from "@tsjam/codec";
import { HeaderHash, HeaderLookupHistory, Tau } from "@tsjam/types";
import { JamHeaderImpl } from "./JamHeaderImpl";

/**
 * This is not really defined in graypaper
 * but used to compute $(0.6.4 - 11.34)
 */
export class HeaderLookupHistoryImpl
  extends BaseJamCodecable
  implements HeaderLookupHistory
{
  elements!: Map<
    Tau,
    {
      header: JamHeaderImpl;
      hash: HeaderHash;
    }
  >;

  get(t: Tau) {
    return this.elements.get(t);
  }
}
