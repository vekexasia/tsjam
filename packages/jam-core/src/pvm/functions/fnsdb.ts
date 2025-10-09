import { log } from "@/utils";
import { PVM } from "@tsjam/pvm-base";
import { IxMod } from "@tsjam/pvm-js";
import {
  Gas,
  PVMExitReason,
  PVMExitReasonMod,
  PVMSingleModGas,
  u8,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

type PVMFn<Args, Out> = (pvm: PVM, args: Args) => Out;
export const FnsDb = {
  byCode: new Map<u8, string>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  byIdentifier: new Map<string, PVMFn<any, any>>(),
};
/**
 * A generic PVM instruction that can take any number of arguments
 * A single instruction needs to implement this interface
 */
export interface DetailedPVMFn<Args, Out> {
  execute(pvm: PVM, args: Args): Out;
  gasCost: Gas | ((pvm: PVM, args: Args) => Gas);
  opCode: number;
  identifier: string;
}

/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regFn = <Args, Out>(conf: {
  fn: DetailedPVMFn<Args, Out[]>;
}): PVMFn<
  Args,
  | Array<Out | PVMSingleModGas>
  | [PVMSingleModGas, PVMExitReasonMod<PVMExitReason>]
> => {
  if (FnsDb.byCode.has(toTagged(conf.fn.opCode))) {
    throw new Error(`duplicate opCode ${conf.fn.opCode} ${conf.fn.identifier}`);
  }
  if (FnsDb.byIdentifier.has(conf.fn.identifier)) {
    throw new Error(`duplicate identifier ${conf.fn.identifier}`);
  }
  const newfn: PVMFn<
    Args,
    | Array<Out | PVMSingleModGas>
    | [PVMSingleModGas, PVMExitReasonMod<PVMExitReason>]
  > = (pvm: PVM, args) => {
    // $(0.7.1 - B.17 / B.19 / B.21)
    const gas =
      typeof conf.fn.gasCost === "function"
        ? conf.fn.gasCost(pvm, args)
        : conf.fn.gasCost;
    if (gas > pvm.gas) {
      // $(0.7.1 - B.18 / B.20 / B.22) | first bracket
      return [IxMod.gas(gas), IxMod.outOfGas()];
    }
    return [IxMod.gas(gas), ...conf.fn.execute(pvm, args)];
  };

  FnsDb.byCode.set(conf.fn.opCode as u8, conf.fn.identifier);
  FnsDb.byIdentifier.set(conf.fn.identifier, newfn);
  return newfn;
};

export const HostFn = <Args, Out>(
  opCode: number,
  gasCost: Gas | ((pvm: PVM, args: Args) => Gas) = <Gas>10n,
) => {
  return (
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(pvm: PVM, args: Args) => Out[]>,
  ) => {
    const fn = regFn<Args, Out>({
      fn: {
        opCode: opCode as u8,
        identifier: propertyKey,
        execute: descriptor.value!,
        gasCost,
      },
    });
    descriptor.value = function (pvm: PVM, args: Args) {
      log(`\nHostCall[${propertyKey}]`, process.env.DEBUG_STEPS == "true");
      // eslint-disable-next-line
      const res = <any>fn.call(this, pvm, args);
      // log(res, process.env.DEBUG_STEPS == "true");
      return res;
    };
    return descriptor;
  };
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
