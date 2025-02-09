import { Gas, PVMIx, PVMIxExecutionError, u8 } from "@tsjam/types";

export const Ixdb = {
  byCode: new Map<u8, PVMIx<unknown, PVMIxExecutionError>>(),
  byIdentifier: new Map<string, PVMIx<unknown, PVMIxExecutionError>>(),
  blockTerminators: new Set<u8>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regIx = <T, K extends PVMIxExecutionError = PVMIxExecutionError>(
  ix: PVMIx<T, K>,
  isBlockTerminator: boolean = false,
): PVMIx<T, K> => {
  if (Ixdb.byCode.has(ix.opCode)) {
    throw new Error(`duplicate opCode ${ix.opCode}`);
  }
  if (Ixdb.byIdentifier.has(ix.identifier)) {
    throw new Error(`duplicate identifier ${ix.identifier}`);
  }
  Ixdb.byCode.set(ix.opCode, ix);
  Ixdb.byIdentifier.set(ix.identifier, ix);
  if (isBlockTerminator) {
    Ixdb.blockTerminators.add(ix.opCode);
  }
  return ix;
};

// test
if (import.meta.vitest) {
  const { describe, expect, it, beforeEach } = import.meta.vitest;
  const { ok } = await import("neverthrow");
  describe("regIx", () => {
    beforeEach(() => {
      Ixdb.byCode.clear();
      Ixdb.byIdentifier.clear();
      Ixdb.blockTerminators.clear();
    });
    it("register an ix", () => {
      const ix = regIx(
        {
          opCode: 0 as u8,
          identifier: "test",
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
          gasCost: 1n as Gas,
        },
        true, // blockterminator
      );
      expect(Ixdb.byCode.get(0 as u8)).toBe(ix);
      expect(Ixdb.byIdentifier.get("test")).toBe(ix);
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(true);
    });
    it("throws on duplicate opCode", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        gasCost: 1n as Gas,
        decode() {
          return ok([]);
        },
        evaluate() {
          return ok([]);
        },
      });
      expect(() =>
        regIx({
          opCode: 0 as u8,
          identifier: "test2",
          gasCost: 1n as Gas,
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
        }),
      ).toThrow();
    });
    it("throws on duplicate identifier", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        gasCost: 1n as Gas,
        decode() {
          return ok([]);
        },
        evaluate() {
          return ok([]);
        },
      });
      expect(() =>
        regIx({
          opCode: 1 as u8,
          identifier: "test",
          gasCost: 1n as Gas,
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
        }),
      ).toThrow();
    });
    it("does not register blockTermination", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        gasCost: 1n as Gas,
        decode() {
          return ok([]);
        },
        evaluate() {
          return ok([]);
        },
      });
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(false);
    });
  });
}
