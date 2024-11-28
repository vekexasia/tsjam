import { Gas, PVMIx, PVMIxExecutionError, u8 } from "@tsjam/types";

export const Ixdb = {
  byCode: new Map<u8, PVMIx<unknown[], PVMIxExecutionError>>(),
  byIdentifier: new Map<string, PVMIx<unknown[], PVMIxExecutionError>>(),
  blockTerminators: new Set<u8>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regIx = <
  T extends unknown[],
  K extends PVMIxExecutionError = PVMIxExecutionError,
>(conf: {
  /**
   * the identifier of the instruction
   */
  opCode: u8;
  /**
   * the human readable name of the instruction
   */
  identifier: string;
  /**
   * whether the instruction is a block terminator
   * @remarks see Appendix A.3
   */
  blockTermination?: true;

  ix: Omit<PVMIx<T, K>, "opCode" | "identifier">;
}): PVMIx<T, K> => {
  const ix = {
    ...conf.ix,
    opCode: conf.opCode,
    identifier: conf.identifier,
  };
  if (Ixdb.byCode.has(conf.opCode)) {
    throw new Error(`duplicate opCode ${conf.opCode}`);
  }
  if (Ixdb.byIdentifier.has(conf.identifier)) {
    throw new Error(`duplicate identifier ${conf.identifier}`);
  }
  Ixdb.byCode.set(conf.opCode, ix);
  Ixdb.byIdentifier.set(conf.identifier, ix);
  if (conf.blockTermination) {
    Ixdb.blockTerminators.add(conf.opCode);
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
      const ix = regIx({
        opCode: 0 as u8,
        identifier: "test",
        blockTermination: true,
        ix: {
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
          gasCost: 1n as Gas,
        },
      });
      expect(Ixdb.byCode.get(0 as u8)).toBe(ix);
      expect(Ixdb.byIdentifier.get("test")).toBe(ix);
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(true);
    });
    it("throws on duplicate opCode", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        ix: {
          gasCost: 1n as Gas,
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
        },
      });
      expect(() =>
        regIx({
          opCode: 0 as u8,
          identifier: "test2",
          ix: {
            gasCost: 1n as Gas,
            decode() {
              return ok([]);
            },
            evaluate() {
              return ok([]);
            },
          },
        }),
      ).toThrow();
    });
    it("throws on duplicate identifier", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        ix: {
          gasCost: 1n as Gas,
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
        },
      });
      expect(() =>
        regIx({
          opCode: 1 as u8,
          identifier: "test",
          ix: {
            gasCost: 1n as Gas,
            decode() {
              return ok([]);
            },
            evaluate() {
              return ok([]);
            },
          },
        }),
      ).toThrow();
    });
    it("does not register blockTermination", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        ix: {
          gasCost: 1n as Gas,
          decode() {
            return ok([]);
          },
          evaluate() {
            return ok([]);
          },
        },
      });
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(false);
    });
  });
}
