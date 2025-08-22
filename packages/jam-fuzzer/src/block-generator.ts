import {
  JamBlockExtrinsicsImpl,
  JamBlockImpl,
  JamStateImpl,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { Posterior, u32, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { VALIDATORS } from "./debugKeys";
import { GENESIS_STATE } from "./genesis";

export const produceBlock = (
  state: JamStateImpl,
  p_tau: Validated<Posterior<TauImpl>>,
) => {
  const extrinsics = JamBlockExtrinsicsImpl.newEmpty();
  const p_entropy13 = state.entropy.rotate1_3({ slot: state.slot, p_tau });
  const p_kappa = state.kappa.toPosterior(state, { p_tau });
  const p_gamma_s = state.safroleState.gamma_s.toPosterior({
    safroleState: state.safroleState,
    slot: state.slot,
    p_tau,
    p_kappa,
    p_eta2: p_entropy13._2,
  });
  const validatorKey = VALIDATORS.find((keyPairs) =>
    p_gamma_s.isKeyAllowedToProduce(keyPairs.bandersnatch, {
      p_tau,
      p_entropy_3: p_entropy13._3,
    }),
  );
  if (typeof validatorKey === "undefined") {
    throw new Error("No validator key found for producing the block");
  }

  const [blockErr, block] = JamBlockImpl.create(
    state,
    p_tau,
    extrinsics,
    validatorKey.bandersnatch,
  ).safeRet();
  if (blockErr) {
    throw new Error(blockErr);
  }

  const [sateErr, newState] = state.applyBlock(block).safeRet();

  if (sateErr) {
    throw new Error(sateErr);
  }
  return newState;
};

if (import.meta.vitest) {
  const { describe, it } = import.meta.vitest;

  describe("BlockGenerator", () => {
    it("should produce a valid block from the genesis state", () => {
      produceBlock(GENESIS_STATE, toTagged(new SlotImpl(<u32>420420)));
    });

    it("should produce a valid block skipping epoch", () => {
      produceBlock(GENESIS_STATE, toTagged(new SlotImpl(<u32>601)));
    });
  });
}
