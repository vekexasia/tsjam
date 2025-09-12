import {
  AppliedBlock,
  ChainManager,
  JamBlockExtrinsicsImpl,
  SlotImpl,
  TauImpl,
} from "@tsjam/core";
import { Posterior, u32, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { VALIDATORS } from "./debugKeys";
import { GENESIS } from "./genesis";

export const produceBlock = async (
  parent: AppliedBlock,
  p_tau: Validated<Posterior<TauImpl>>,
  chainManager: ChainManager,
): Promise<AppliedBlock> => {
  const state = parent.posteriorState;
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

  const [blockErr, block] = parent
    .createNext(p_tau, extrinsics, validatorKey.bandersnatch)
    .safeRet();
  if (blockErr) {
    throw new Error(blockErr);
  }

  const [sateErr, newBlock] = (
    await chainManager.handleIncomingBlock(block)
  ).safeRet();

  if (sateErr) {
    throw new Error(sateErr);
  }
  return newBlock;
};

if (import.meta.vitest) {
  const { describe, it } = import.meta.vitest;

  describe("BlockGenerator", () => {
    it("should produce a valid block from the genesis state", async () => {
      const chainManager = await ChainManager.build(GENESIS);
      produceBlock(GENESIS, toTagged(new SlotImpl(<u32>420420)), chainManager);
    });

    it("should produce a valid block skipping epoch", async () => {
      const chainManager = await ChainManager.build(GENESIS);
      produceBlock(GENESIS, toTagged(new SlotImpl(<u32>601)), chainManager);
    });
  });
}
