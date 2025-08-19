import { SafeMap } from "@/data-structures/safe-map";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";
import { HeaderLookupHistory } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { JamSignedHeaderImpl } from "./jam-signed-header-impl";
import type { SlotImpl } from "./slot-impl";

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
    const toRet = new HeaderLookupHistoryImpl(new SafeMap([...this.elements]));

    toRet.elements.set(deps.header.slot, deps.header);
    const k = [...this.elements.keys()];
    if (k.length > MAXIMUM_AGE_LOOKUP_ANCHOR) {
      k.sort((a, b) => a.value - b.value);
      // we assume it's being called at each block
      toRet.elements.delete(k[0]);
    }
    return toPosterior(toRet);
  }

  static newEmpty() {
    return new HeaderLookupHistoryImpl(new SafeMap());
  }
}
