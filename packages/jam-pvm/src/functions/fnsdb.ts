import {
  PVMFn,
  PVMProgramExecutionContextBase,
  u8,
} from "@vekexasia/jam-types";

export const FnsDb = {
  byCode: new Map<u8, PVMFn<unknown[], any>>(),
  byIdentifier: new Map<string, PVMFn<unknown[], any>>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regFn = <
  Args extends unknown[],
  Out,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
>(conf: {
  /**
   * the identifier of the instruction
   */
  opCode: u8;
  /**
   * the human readable name of the instruction
   */
  identifier: string;

  fn: PVMFn<Args, Out, CTX>;
}): PVMFn<Args, Out, CTX> => {
  if (FnsDb.byCode.has(conf.opCode)) {
    throw new Error(`duplicate opCode ${conf.opCode}`);
  }
  if (FnsDb.byIdentifier.has(conf.identifier)) {
    throw new Error(`duplicate identifier ${conf.identifier}`);
  }
  FnsDb.byCode.set(conf.opCode, conf.fn);
  FnsDb.byIdentifier.set(conf.identifier, conf.fn);
  return conf.fn;
};

// test
if (import.meta.vitest) {
  const { describe, expect, it, beforeEach } = import.meta.vitest;
  describe("regFn", () => {
    beforeEach(() => {
      FnsDb.byCode.clear();
      FnsDb.byIdentifier.clear();
    });
    it("register an fn", () => {
      const fn = regFn({
        opCode: 0 as u8,
        identifier: "test",
        fn: {
          execute() {
            return {} as any;
          },
          gasCost: 1n,
        },
      });
      expect(FnsDb.byCode.get(0 as u8)).toBe(fn);
      expect(FnsDb.byIdentifier.get("test")).toBe(fn);
    });
    it("throws on duplicate opCode", () => {
      regFn({
        opCode: 0 as u8,
        identifier: "test",
        fn: {
          gasCost: 1n,
          execute() {
            return {} as any;
          },
        },
      });
      expect(() =>
        regFn({
          opCode: 0 as u8,
          identifier: "test2",
          fn: {
            gasCost: 1n,
            execute() {
              return {} as any;
            },
          },
        }),
      ).toThrow();
    });
    it("throws on duplicate identifier", () => {
      regFn({
        opCode: 0 as u8,
        identifier: "test",
        fn: {
          gasCost: 1n,
          execute() {
            return {} as any;
          },
        },
      });
      expect(() =>
        regFn({
          opCode: 1 as u8,
          identifier: "test",
          fn: {
            gasCost: 1n,
            execute() {
              return {} as any;
            },
          },
        }),
      ).toThrow();
    });
  });
}
