import {
  Posterior,
  SafroleState,
  TicketIdentifier,
  newSTF,
  u32,
} from "@vekexasia/jam-types";
import { isNewEra } from "@/utils.js";
import { TauTransition } from "@/state_updaters/types.js";
import assert from "node:assert";
import { EPOCH_LENGTH } from "@vekexasia/jam-constants";

type Input = {
  tauTransition: TauTransition;
  newIdentifiers: TicketIdentifier[];
};
/**
 * update `gamma_a` (79)
 */
export const gamma_aSTF = newSTF<SafroleState["gamma_a"], Input>({
  assertInputValid(): void {},
  assertPStateValid(input, p_gamma_a): void {
    // we need to checj (80) so that the p_gamma_a contains all the new ticketidentifiersup
    // in posterior gamma_a
    const p_gamma_a_ids = p_gamma_a.map((x) => x.id);

    for (const x of input.newIdentifiers) {
      assert(p_gamma_a_ids.includes(x.id), "Ticket not in posterior gamma_a");
    }
  },

  apply(input: Input, gamma_a: SafroleState["gamma_a"]) {
    return [
      ...input.newIdentifiers,
      ...(() => {
        if (isNewEra(input.tauTransition.nextTau, input.tauTransition.curTau)) {
          return [];
        }
        return gamma_a;
      })(),
    ]
      .sort((a, b) => (a.id - b.id < 0 ? -1 : 1))
      .slice(0, EPOCH_LENGTH) as Posterior<SafroleState["gamma_a"]>;
  },
});

// TESTS
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { mockState, mockTicketIdentifier } = await import(
    "../../test/mocks.js"
  );

  describe("computePosteriorGammaA", () => {
    it("should add new identifiers", () => {
      const pga = gamma_aSTF.apply(
        {
          tauTransition: { curTau: 0 as u32, nextTau: 0 as u32 },
          newIdentifiers: [mockTicketIdentifier({ id: 1n })],
        },
        mockState({
          gamma_a: [mockTicketIdentifier({ id: 0n })],
        }).gamma_a,
      );

      expect(pga).toEqual([
        mockTicketIdentifier({ id: 0n }),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should chunk to EPOCH_LENGTH", () => {
      const pga = gamma_aSTF.apply(
        {
          tauTransition: { curTau: 0 as u32, nextTau: 0 as u32 },
          newIdentifiers: [mockTicketIdentifier({ id: 1n })],
        },
        mockState({
          gamma_a: [
            ...new Array(EPOCH_LENGTH - 1).fill(
              mockTicketIdentifier({ id: 0n }),
            ),
            mockTicketIdentifier({ id: 2n }),
          ],
        }).gamma_a,
      );
      expect(pga).toEqual([
        ...new Array(EPOCH_LENGTH - 1).fill(mockTicketIdentifier({ id: 0n })),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should reset if new era", () => {
      const pga = gamma_aSTF.apply(
        {
          tauTransition: { curTau: 0 as u32, nextTau: EPOCH_LENGTH as u32 },
          newIdentifiers: [mockTicketIdentifier({ id: 1n })],
        },
        mockState({
          gamma_a: [
            ...new Array(EPOCH_LENGTH - 1).fill(
              mockTicketIdentifier({ id: 0n }),
            ),
          ],
        }).gamma_a,
      );
      expect(pga).toEqual([mockTicketIdentifier({ id: 1n })]);
    });
  });
}
