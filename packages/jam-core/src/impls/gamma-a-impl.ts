import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { GammaA, Posterior, UpToSeq, Validated } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { TicketImpl } from "./ticket-impl";
import { compareUint8Arrays } from "uint8array-extras";

export enum GammaAError {
  TICKET_NOT_IN_POSTERIOR_GAMMA_A = "Ticket not in posterior gamma_a",
}

@JamCodecable()
export class GammaAImpl extends BaseJamCodecable implements GammaA {
  @lengthDiscriminatedCodec(TicketImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<TicketImpl, typeof EPOCH_LENGTH, "gamma_a">;

  constructor(config: ConditionalExcept<GammaAImpl, Function>) {
    super();
    Object.assign(this, config);
  }
  length() {
    return this.elements.length;
  }

  /**
   * $(0.7.1 - 6.34)
   */
  toPosterior(deps: {
    slot: JamStateImpl["slot"];
    p_tau: Validated<Posterior<TauImpl>>;
    // bold_n in the paper
    newTickets: TicketImpl[];
  }): Result<Posterior<GammaAImpl>, GammaAError> {
    const toRet = new GammaAImpl({
      elements: <GammaAImpl["elements"]>[
        ...deps.newTickets,
        ...(() => {
          if (deps.p_tau.isNewerEra(deps.slot)) {
            return [];
          }
          return this.elements;
        })(),
      ]
        .sort((a, b) => compareUint8Arrays(a.id, b.id))
        .slice(0, EPOCH_LENGTH),
    });

    // $(0.7.1 - 6.35) | check `n` subset of p_gamma_a after slice
    const p_gamma_a_ids = new Set(toRet.elements.map((x) => x.id));
    for (const x of deps.newTickets) {
      if (!p_gamma_a_ids.has(x.id)) {
        // invalid ticket has been submitted.
        return err(GammaAError.TICKET_NOT_IN_POSTERIOR_GAMMA_A);
      }
    }
    return ok(toPosterior(toRet));
  }
}
