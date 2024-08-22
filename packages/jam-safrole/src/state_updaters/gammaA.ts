import { SafroleState } from "@/index.js";
import {
  EPOCH_LENGTH,
  JamHeader,
  Posterior,
  TicketIdentifier,
} from "@vekexasia/jam-types";
import { isNewEra } from "@/utils.js";

/**
 * update `gamma_a` (79)
 */
export const computePosteriorGammaA = (
  state: SafroleState,
  header: JamHeader,
  p_header: Posterior<JamHeader>,
  newIdentifiers: TicketIdentifier[],
): Posterior<SafroleState["gamma_a"]> => {
  return [
    ...newIdentifiers,
    ...(() => {
      if (isNewEra(p_header, header)) {
        return [];
      }
      return state.gamma_a;
    })(),
  ]
    .sort((a, b) => (a.id - b.id < 0 ? -1 : 1))
    .slice(0, EPOCH_LENGTH) as Posterior<SafroleState["gamma_a"]>;
};

// TESTS
if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  const { mockState, mockTicketIdentifier, mockHeader } = await import(
    "../../test/mocks.js"
  );
  // aaa

  vi.mock("@vekexasia/jam-crypto", () => ({
    Hashing: {
      blake2bBuf: vi.fn((buf: Uint8Array) => buf),
    },
  }));
  describe("computePosteriorGammaA", () => {
    it("should add new identifiers", () => {
      const pga = computePosteriorGammaA(
        mockState({
          gamma_a: [mockTicketIdentifier({ id: 0n })],
        }),
        mockHeader(),
        mockHeader() as Posterior<JamHeader>,
        [mockTicketIdentifier({ id: 1n })],
      );
      expect(pga).toEqual([
        mockTicketIdentifier({ id: 0n }),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should chunk to EPOCH_LENGTH", () => {
      const pga = computePosteriorGammaA(
        mockState({
          gamma_a: [
            ...new Array(EPOCH_LENGTH - 1).fill(
              mockTicketIdentifier({ id: 0n }),
            ),
            mockTicketIdentifier({ id: 2n }),
          ],
        }),
        mockHeader(),
        mockHeader() as Posterior<JamHeader>,
        [mockTicketIdentifier({ id: 1n })],
      );
      expect(pga).toEqual([
        ...new Array(EPOCH_LENGTH - 1).fill(mockTicketIdentifier({ id: 0n })),
        mockTicketIdentifier({ id: 1n }),
      ]);
    });
    it("should reset if new era", () => {
      const pga = computePosteriorGammaA(
        mockState({
          gamma_a: [
            ...new Array(EPOCH_LENGTH - 1).fill(
              mockTicketIdentifier({ id: 0n }),
            ),
          ],
        }),
        mockHeader(),
        mockHeader({ timeSlotIndex: EPOCH_LENGTH }) as Posterior<JamHeader>,
        [mockTicketIdentifier({ id: 1n })],
      );
      expect(pga).toEqual([mockTicketIdentifier({ id: 1n })]);
    });
  });
}
