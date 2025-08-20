import { SafeKey, SafeKeyable } from "@/data-structures/safe-key";
import {
  JamCodecable,
  BaseJamCodecable,
  eSubIntCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { BLOCK_TIME, EPOCH_LENGTH, JAM_COMMON_ERA } from "@tsjam/constants";
import type { Posterior, Slot, Tagged, u32, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";

/**
 * A slot is a block slot. Which is derived using current time since epoch / blocktime
 */
@JamCodecable()
export class SlotImpl extends BaseJamCodecable implements Slot, SafeKeyable {
  @eSubIntCodec(4, SINGLE_ELEMENT_CLASS)
  value!: u32;
  constructor(value?: u32) {
    super();
    // if value is not provided, it will be set from codec
    this.value = value!;
  }

  safeKey(): SafeKey {
    return this.value;
  }

  /**
   * `e` in the graypaper
   * @see section 6.1 - Timekeeping
   * $(0.7.1 - 6.2)
   */
  epochIndex(): Tagged<u32, "epoch-index"> {
    return toTagged(<u32>Math.floor(this.value / EPOCH_LENGTH));
  }

  /**
   * `m` in the graypaper
   * $(0.7.1 - 6.2)
   */
  slotPhase(): Tagged<u32, "slot"> {
    return toTagged(<u32>(this.value % EPOCH_LENGTH));
  }

  /**
   * checks if this slot is in the same epoch as the other slot
   */
  isSameEra(other: SlotImpl): boolean {
    return this.epochIndex() === other.epochIndex();
  }

  /**
   * checks if this represents a newer era
   * @param other - the other slot to compare with
   */
  isNewerEra(this: Posterior<SlotImpl>, other: SlotImpl): boolean {
    return this.epochIndex() > other.epochIndex();
  }

  /**
   * checks if this is inside the next era compared to the other slot
   * @param other - the other slot to compare with
   */
  isNextEra(this: Posterior<SlotImpl>, other: SlotImpl): boolean {
    return this.epochIndex() === other.epochIndex() + 1;
  }

  /**
   * $(0.7.1 - 5.7)
   */
  checkPTauValid(
    this: Posterior<TauImpl>,
    prevTau: TauImpl,
  ): Result<Validated<Posterior<TauImpl>>, TauError> {
    if (this.value <= prevTau.value) {
      return err(TauError.POSTERIOR_TAU_LESS_OR_EQUAL_TAU);
    }
    // Ht * P <= T
    //     Ht <= T/P
    //     inverted for error checking
    if (this.value > SlotImpl.posteriorTau().value) {
      return err(TauError.POSTERIOR_TAU_IN_FUTURE);
    }
    return ok(toTagged(this));
  }

  static posteriorTau(): Validated<Posterior<TauImpl>> {
    return toTagged(new SlotImpl(<u32>Math.floor(this.bigT() / BLOCK_TIME)));
  }

  /**
   * `T` - defined in 4.4
   */
  static bigT(): u32 {
    const now = (Date.now() / 1000) | 0;
    return <u32>(now - JAM_COMMON_ERA);
  }
}

export enum TauError {
  POSTERIOR_TAU_LESS_OR_EQUAL_TAU = "POSTERIOR_TAU_LESS_OR_EQUAL_TAU",
  POSTERIOR_TAU_IN_FUTURE = "POSTERIOR_TAU_IN_FUTURE",
}

export type TauImpl = Tagged<SlotImpl, "tau">;
