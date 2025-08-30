import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { Gas, PVMIx, PVMIxDecodeFN, u32, u8 } from "@tsjam/types";
import { HydratedArgs } from "./types";
import { hydrateIxArgs } from "./hydrator";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { TRAP_COST } from "./utils";

export const Ixdb = {
  byCode: new Map<u8, PVMIx<unknown>>(),
  byIdentifier: new Map<string, PVMIx<unknown>>(),
  blockTerminators: new Set<u8>(),
};
/**
 * register an instruction in the instruction database
 * @param conf - the configuration object
 */
export const regIx = <T>(
  ix: PVMIx<T>,
  isBlockTerminator: boolean = false,
): PVMIx<T> => {
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

/**
 * Decorator to register an instruction
 */
export const Ix = <
  Descriptor extends (
    args: HydratedArgs<Args>,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) => void | PVMExitReasonImpl,
  Args,
>(
  opCode: number,
  decoder: PVMIxDecodeFN<Args>,
  handlesInstructionPointer?: boolean,
) => {
  return (
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<Descriptor>,
  ) => {
    regIx<Args>(
      {
        opCode: opCode as u8,
        identifier: propertyKey,
        decode: decoder,
        evaluate: function hydratedEvaluate(
          args: HydratedArgs<Args>,
          context: PVMIxEvaluateFNContextImpl,
          skip: number,
        ) {
          const toRet = descriptor.value!(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hydrateIxArgs(<any>args, context),
            context,
            skip,
          );
          context.execution.gas = <Gas>(context.execution.gas - this.gasCost);
          if (toRet?.isPageFault()) {
            context.execution.gas = <Gas>(context.execution.gas - TRAP_COST);
          } else {
            if (!handlesInstructionPointer) {
              context.execution.instructionPointer = <u32>(
                (context.execution.instructionPointer + skip)
              );
            }
          }
          return toRet;
        },
        gasCost: 1n as Gas,
      },
      (descriptor as { isBlockTermination: boolean })
        .isBlockTermination as boolean,
    );
    return descriptor;
  };
};

/**
 * Decorator to mark an instruction as block termination
 * must be used AFTER @Ix
 */
export const BlockTermination = (
  _target: unknown,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  (
    descriptor as unknown as { isBlockTermination: boolean }
  ).isBlockTermination = true;
  return descriptor;
};

// test
if (import.meta.vitest) {
  const { describe, expect, it, beforeEach } = import.meta.vitest;
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
            return [];
          },
          evaluate() {},
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
          return [];
        },
        evaluate() {},
      });
      expect(() =>
        regIx({
          opCode: 0 as u8,
          identifier: "test2",
          gasCost: 1n as Gas,
          decode() {
            return [];
          },
          evaluate() {},
        }),
      ).toThrow();
    });
    it("throws on duplicate identifier", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        gasCost: 1n as Gas,
        decode() {
          return [];
        },
        evaluate() {},
      });
      expect(() =>
        regIx({
          opCode: 1 as u8,
          identifier: "test",
          gasCost: 1n as Gas,
          decode() {
            return [];
          },
          evaluate() {},
        }),
      ).toThrow();
    });
    it("does not register blockTermination", () => {
      regIx({
        opCode: 0 as u8,
        identifier: "test",
        gasCost: 1n as Gas,
        decode() {
          return [];
        },
        evaluate() {},
      });
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(false);
    });
  });
}
