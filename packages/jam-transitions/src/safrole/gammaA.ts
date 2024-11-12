import {
  Posterior,
  STF,
  SafroleState,
  Tau,
  TicketIdentifier,
} from "@tsjam/types";
import assert from "node:assert";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { isNewEra } from "@tsjam/utils";
import { ok } from "neverthrow";

type Input = {
  tau: Tau;
  p_tau: Posterior<Tau>;
  newIdentifiers: TicketIdentifier[];
};

export enum GammaAError {
  TICKET_NOT_IN_POSTERIOR_GAMMA_A = "Ticket not in posterior gamma_a",
}
/**
 * update `gamma_a`
 * (79) - 0.4.5
 */
export const gamma_aSTF: STF<SafroleState["gamma_a"], Input, GammaAError> = (
  input: Input,
  gamma_a: SafroleState["gamma_a"],
) => {
  const toRet = [
    ...input.newIdentifiers,
    ...(() => {
      if (isNewEra(input.p_tau, input.tau)) {
        return [];
      }
      return gamma_a;
    })(),
  ]
    .sort((a, b) => (a.id - b.id < 0 ? -1 : 1))
    .slice(0, EPOCH_LENGTH) as Posterior<SafroleState["gamma_a"]>;

  // (80) check `n` subset of p_gamma_a
  const p_gamma_a_ids = new Set(toRet.map((x) => x.id));
  for (const x of input.newIdentifiers) {
    assert(p_gamma_a_ids.has(x.id), "Ticket not in posterior gamma_a");
  }
  return ok(toRet);
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { mockState, mockTicketIdentifier } = await import(
    "../../test/safroleMocks.js"
  );

  describe("computePosteriorGammaA", () => {
    it("should add new identifiers", () => {
      const pga = gamma_aSTF(
        {
          tau: 0 as Tau,
          p_tau: 0 as Posterior<Tau>,
          newIdentifiers: [mockTicketIdentifier({ id: 1n })],
        },
        mockState({
          gamma_a: [mockTicketIdentifier({ id: 0n })],
        }).gamma_a,
      );
      expect(pga.isOk()).toBe(true);

      expect(pga._unsafeUnwrap()).toEqual([
        mockTicketIdentifier({ id: 0n }),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should chunk to EPOCH_LENGTH", () => {
      const pga = gamma_aSTF(
        {
          tau: 0 as Tau,
          p_tau: 0 as Posterior<Tau>,
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
      expect(pga.isOk()).toBe(true);
      expect(pga._unsafeUnwrap()).toEqual([
        ...new Array(EPOCH_LENGTH - 1).fill(mockTicketIdentifier({ id: 0n })),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should reset if new era", () => {
      const pga = gamma_aSTF(
        {
          tau: 0 as Tau,
          p_tau: EPOCH_LENGTH as Posterior<Tau>,
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

      expect(pga.isOk()).toBe(true);
      expect(pga._unsafeUnwrap()).toEqual([mockTicketIdentifier({ id: 1n })]);
    });
  });
}
