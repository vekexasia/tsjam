import { SafeMap } from "@/data_structures/safeMap";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";
import { HeaderLookupHistory } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { JamSignedHeaderImpl } from "./JamSignedHeaderImpl";
import { SlotImpl } from "./SlotImpl";

/**
 * This is not really defined in graypaper
 * but used to compute $(0.7.1 - 11.34)
 */
export class HeaderLookupHistoryImpl implements HeaderLookupHistory {
  elements!: SafeMap<SlotImpl, JamSignedHeaderImpl>;
  constructor(elements?: SafeMap<SlotImpl, JamSignedHeaderImpl>) {
    if (elements) {
      this.elements = elements;
    }
  }

  get(t: SlotImpl) {
    return this.elements.get(t);
  }

  toPosterior(deps: { header: JamSignedHeaderImpl }): HeaderLookupHistoryImpl {
    const toRet = structuredClone(this);

    toRet.elements.set(deps.header.slot, deps.header);
    const k = [...this.elements.keys()];
    if (k.length > MAXIMUM_AGE_LOOKUP_ANCHOR) {
      k.sort((a, b) => a.value - b.value);
      // we assume it's being called at each block
      toRet.elements.delete(k[0]);
    }
    return toPosterior(toRet);
  }
}
