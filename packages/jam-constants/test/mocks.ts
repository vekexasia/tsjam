import { vi } from "vitest";

export const constantMocks = vi.hoisted(() => {
  return {
    LOTTERY_MAX_SLOT: 500,
    MAX_TICKETS_PER_BLOCK: 16,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
  };
});
vi.mock("@vekexasia/jam-constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@vekexasia/jam-constants")>()),
  };
  Object.defineProperty(toRet, "EPOCH_LENGTH", {
    get() {
      return constantMocks.EPOCH_LENGTH;
    },
  });
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return constantMocks.NUMBER_OF_VALIDATORS;
    },
  });
  return toRet;
});
