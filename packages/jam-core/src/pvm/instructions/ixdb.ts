import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { Gas, PVMIx, PVMIxDecodeFN, PVMIxReturnMods, u8 } from "@tsjam/types";

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
  Descriptor extends
    | ((args: Args) => EvaluateReturn)
    | ((args: Args, context: PVMIxEvaluateFNContextImpl) => EvaluateReturn),
  Args,
  EvaluateReturn extends PVMIxReturnMods,
>(
  opCode: number,
  decoder: PVMIxDecodeFN<Args>,
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
        evaluate: descriptor.value!,
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
          evaluate() {
            return [];
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
          return [];
        },
        evaluate() {
          return [];
        },
      });
      expect(() =>
        regIx({
          opCode: 0 as u8,
          identifier: "test2",
          gasCost: 1n as Gas,
          decode() {
            return [];
          },
          evaluate() {
            return [];
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
          return [];
        },
        evaluate() {
          return [];
        },
      });
      expect(() =>
        regIx({
          opCode: 1 as u8,
          identifier: "test",
          gasCost: 1n as Gas,
          decode() {
            return [];
          },
          evaluate() {
            return [];
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
          return [];
        },
        evaluate() {
          return [];
        },
      });
      expect(Ixdb.blockTerminators.has(0 as u8)).toBe(false);
    });
  });
}
