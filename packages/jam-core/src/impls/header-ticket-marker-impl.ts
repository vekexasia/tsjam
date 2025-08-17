import { outsideInSequencer } from "@/utils";
import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { EPOCH_LENGTH, LOTTERY_MAX_SLOT } from "@tsjam/constants";
import { Posterior, SeqOfLength, TicketMarker, Validated } from "@tsjam/types";
import { GammaAImpl } from "./gamma-a-impl";
import { TauImpl } from "./slot-impl";
import { TicketImpl } from "./ticket-impl";
import { compareUint8Arrays } from "uint8array-extras";

@JamCodecable()
export class HeaderTicketMarkerImpl
  extends BaseJamCodecable
  implements TicketMarker
{
  @sequenceCodec(EPOCH_LENGTH, TicketImpl, SINGLE_ELEMENT_CLASS)
  elements!: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>;
  constructor(elements: TicketImpl[] = []) {
    super();
    Object.assign(this, elements);
  }

  /**
   * $(0.7.1 - 6.28)
   */
  static build(deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    tau: TauImpl;
    gamma_a: GammaAImpl;
  }) {
    if (
      deps.p_tau.isSameEra(deps.tau) &&
      deps.p_tau.slotPhase() < LOTTERY_MAX_SLOT &&
      LOTTERY_MAX_SLOT <= deps.p_tau.slotPhase() &&
      deps.gamma_a.length() === EPOCH_LENGTH
    ) {
      return new HeaderTicketMarkerImpl(
        outsideInSequencer(
          deps.gamma_a.elements as unknown as SeqOfLength<
            TicketImpl,
            typeof EPOCH_LENGTH
          >,
        ),
      );
    } else {
      return undefined;
    }
  }

  /**
   * check winning tickets Hw
   * $(0.7.1 - 6.28)
   */
  static validate(
    value: HeaderTicketMarkerImpl | undefined,
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      tau: TauImpl;
      gamma_a: GammaAImpl;
    },
  ) {
    if (
      deps.p_tau.isSameEra(deps.tau) &&
      deps.p_tau.slotPhase() < LOTTERY_MAX_SLOT &&
      LOTTERY_MAX_SLOT <= deps.p_tau.slotPhase() &&
      deps.gamma_a.length() === EPOCH_LENGTH
    ) {
      if (value?.elements.length !== EPOCH_LENGTH) {
        return false;
      }
      const expectedHw = outsideInSequencer(
        deps.gamma_a.elements as unknown as SeqOfLength<
          TicketImpl,
          typeof EPOCH_LENGTH
        >,
      );
      for (let i = 0; i < EPOCH_LENGTH; i++) {
        if (
          compareUint8Arrays(value.elements[i].id, expectedHw[i].id) !== 0 ||
          value.elements[i].attempt !== expectedHw[i].attempt
        ) {
          return false;
        }
      }
    } else {
      if (typeof value !== "undefined") {
        return false;
      }
    }
    return true;
  }
}
