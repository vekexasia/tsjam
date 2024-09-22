import { PVMFn, u8 } from "@vekexasia/jam-types";
import { toTagged } from "@vekexasia/jam-utils";

export const FnsDb = {
  byCode: new Map<u8, PVMFn<unknown[], any>>(),
  byIdentifier: new Map<string, PVMFn<unknown[], any>>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regFn = <Args extends unknown[], Out extends unknown[]>(conf: {
  fn: PVMFn<Args, Out>;
}): PVMFn<Args, Out> => {
  if (FnsDb.byCode.has(toTagged(conf.fn.opCode))) {
    throw new Error(`duplicate opCode ${conf.fn.opCode}`);
  }
  if (FnsDb.byIdentifier.has(conf.fn.identifier)) {
    throw new Error(`duplicate identifier ${conf.fn.identifier}`);
  }
  FnsDb.byCode.set(conf.fn.opCode as u8, conf.fn as PVMFn<unknown[], any>);
  FnsDb.byIdentifier.set(conf.fn.identifier, conf.fn as PVMFn<unknown[], any>);
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
        fn: {
          opCode: 0 as u8,
          identifier: "test",
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
        fn: {
          opCode: 0 as u8,
          identifier: "test",
          gasCost: 1n,
          execute() {
            return {} as any;
          },
        },
      });
      expect(() =>
        regFn({
          fn: {
            opCode: 0 as u8,
            identifier: "test2",
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
        fn: {
          opCode: 0 as u8,
          identifier: "test",
          gasCost: 1n,
          execute() {
            return {} as any;
          },
        },
      });
      expect(() =>
        regFn({
          fn: {
            opCode: 1 as u8,
            identifier: "test",
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
