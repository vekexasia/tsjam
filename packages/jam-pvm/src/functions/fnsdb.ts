import {
  Gas,
  PVMFn,
  u8,
  PVMProgramExecutionContextBase,
  PVMSingleModGas,
  PVMExitReasonMod,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { IxMod } from "@/instructions/utils";

export const FnsDb = {
  byCode: new Map<u8, string>(),
  byIdentifier: new Map<string, PVMFn<never, unknown>>(),
};
/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface DetailedPVMFn<
  Args extends unknown[],
  Out,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
> {
  execute(context: CTX, ...args: Args): Out;
  gasCost: Gas | ((ctx: CTX, ...args: Args) => Gas);
  opCode: number;
  identifier: string;
}

/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regFn = <Args extends unknown[], Out>(conf: {
  fn: DetailedPVMFn<Args, Out[]>;
}): PVMFn<Args, Array<Out | PVMSingleModGas> | PVMExitReasonMod[]> => {
  if (FnsDb.byCode.has(toTagged(conf.fn.opCode))) {
    throw new Error(`duplicate opCode ${conf.fn.opCode} ${conf.fn.identifier}`);
  }
  if (FnsDb.byIdentifier.has(conf.fn.identifier)) {
    throw new Error(`duplicate identifier ${conf.fn.identifier}`);
  }
  const newfn: PVMFn<
    Args,
    Array<Out | PVMSingleModGas> | [PVMExitReasonMod]
  > = (ctx: PVMProgramExecutionContextBase, ...args) => {
    // $(0.6.1 - B.17 / B.19 / B.21)
    const gas =
      typeof conf.fn.gasCost === "function"
        ? conf.fn.gasCost(ctx, ...args)
        : conf.fn.gasCost;
    if (gas > ctx.gas) {
      // $(0.6.1 - B.18 / B.20 / B.22) | first bracket
      return [IxMod.outOfGas()];
    }
    return [...conf.fn.execute(ctx, ...args), IxMod.gas(gas)];
  };

  FnsDb.byCode.set(conf.fn.opCode as u8, conf.fn.identifier);
  FnsDb.byIdentifier.set(conf.fn.identifier, newfn);
  return newfn;
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
            return {} as never;
          },
          gasCost: 1n as Gas,
        },
      });
      expect(FnsDb.byCode.get(0 as u8)).toBe("test");
      expect(FnsDb.byIdentifier.get("test")).toBe(fn);
    });
    it("throws on duplicate opCode", () => {
      regFn({
        fn: {
          opCode: 0 as u8,
          identifier: "test",
          gasCost: 1n as Gas,
          execute() {
            return {} as never;
          },
        },
      });
      expect(() =>
        regFn({
          fn: {
            opCode: 0 as u8,
            identifier: "test2",
            gasCost: 1n as Gas,
            execute() {
              return {} as never;
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
          gasCost: 1n as Gas,
          execute() {
            return {} as never;
          },
        },
      });
      expect(() =>
        regFn({
          fn: {
            opCode: 1 as u8,
            identifier: "test",
            gasCost: 1n as Gas,
            execute() {
              return {} as never;
            },
          },
        }),
      ).toThrow();
    });
  });
}
