import { PVMProgramCodec } from "@/codecs/pvm-program-codec";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { log } from "@/utils";
import { PVMProgram, PVMProgramCode, u32, u8 } from "@tsjam/types";
import assert from "node:assert";
import "./instructions/instructions";
import { Ixdb, PVMIx } from "./instructions/ixdb";
import { TRAP_COST } from "./instructions/utils";

type InstructionPointer = u32;
type IxPointerCache = {
  opCode: u8;
  // $(0.7.1 - A.3)
  skip: u32;
  isBlockBeginning: boolean;

  // cache stuff
  ix?: PVMIx<unknown>;
  decodedArgs?: object;
};

export class ParsedProgram {
  #ixPointerCache: Map<InstructionPointer, IxPointerCache> = new Map();

  private constructor(public rawProgram: PVMProgram) {
    assert(
      rawProgram.k[0] === 1 && Ixdb.byCode.has(rawProgram.c[0] as u8),
      `First instruction must be an instruction k[0]=${rawProgram.k[0]} c[0]=${rawProgram.c[0]}`,
    );
    let lastBlockTerminator = true;
    let lastIx = 0 as u32;
    for (let i = 1; i < rawProgram.k.length; i++) {
      // if this is an instruction opcode
      if (rawProgram.k[i] === 1) {
        const opCode = rawProgram.c[lastIx] as u8;
        this.#ixPointerCache.set(lastIx, {
          opCode,
          skip: (i - lastIx - 1) as u32,
          isBlockBeginning: lastBlockTerminator,
        });
        lastBlockTerminator = Ixdb.blockTerminators.has(opCode);
        lastIx = i as u32;
      }
    }
    // calculates skips $(0.7.1 - A.3)
    this.#ixPointerCache.set(lastIx, {
      opCode: rawProgram.c[lastIx] as u8,
      skip: (rawProgram.k.length - lastIx - 1) as u32,
      isBlockBeginning: lastBlockTerminator,
    });
  }

  /**
   * returns the cache and lazyloads .ix
   */
  ixCacheAt<K extends PVMIx<unknown>>(
    pointer: InstructionPointer,
  ): IxPointerCache | undefined {
    const ix = this.#ixPointerCache.get(pointer);
    if (typeof ix === "undefined") {
      return undefined;
    }
    if (typeof ix.ix === "undefined") {
      ix.ix = Ixdb.byCode.get(ix.opCode) as K | undefined;
    }
    return ix;
  }

  /**
   * Basically computes `l`
   * $(0.7.1 - A.20)
   */
  skip(pointer: u32): u32 {
    // we assume that the pointer is valid
    return this.#ixPointerCache.get(pointer)!.skip;
  }

  isBlockBeginning(pointer: u32): boolean {
    return this.#ixPointerCache.get(pointer)?.isBlockBeginning === true;
  }

  /**
   * Basic invocation
   * `Ψ` in the graypaper
   * $(0.7.1 - 4.22 / A.1)
   */
  run(ctx: PVMIxEvaluateFNContextImpl): PVMExitReasonImpl {
    let idx = 1;
    const isDebugLog = process.env.DEBUG_STEPS === "true";
    const execCtx = ctx.execution;
    while (execCtx.gas > 0) {
      // const curPointer = execCtx.instructionPointer;
      /**
       * `Ψ1` | singleStep
       * it modifies the context according to the single step.
       * $(0.7.1 - A.6)
       */

      {
        const ip = ctx.execution.instructionPointer;
        const ixCache = this.ixCacheAt(ip);
        if (
          typeof ixCache === "undefined" ||
          typeof ixCache.ix === "undefined"
        ) {
          // @ts-expect-error bigint
          ctx.execution.gas -= TRAP_COST;
          return PVMExitReasonImpl.panic();
        }

        const skip = ixCache.skip + 1;
        // lazyload decodedArgs
        if (typeof ixCache.decodedArgs === "undefined") {
          try {
            const byteArgs = this.rawProgram.c.subarray(ip + 1, ip + skip);

            ixCache.decodedArgs = <object>ixCache.ix.decode(byteArgs);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            console.warn(
              `Decoding error for ${ixCache.ix.identifier}`,
              e.message,
            );
            // @ts-expect-error bigint
            ctx.execution.instructionPointer += skip;
            // @ts-expect-error bigint
            ctx.execution.gas += TRAP_COST + ixCache.ix.gasCost;
            return PVMExitReasonImpl.panic();
          }
        }

        const res = <PVMExitReasonImpl | undefined>(
          ixCache.ix.evaluate(ixCache.decodedArgs, ctx, skip)
        );
        if (isDebugLog) {
          log(
            `${(idx++).toString().padEnd(4, " ")} [@${ip.toString().padEnd(6, " ")}] - ${ixCache?.ix?.identifier.padEnd(20, " ")} ${debugContext(ctx.execution)}`,
            true,
          );
        }
        if (typeof res !== "undefined") {
          return res;
        }
      }
      // if (typeof exitReason !== "undefined") {
      //   log("exitReson != empty", isDebugLog);
      //   log(exitReason.toString(), isDebugLog);
      //   return exitReason;
      // }
    }
    return PVMExitReasonImpl.outOfGas();
  }

  /**
   * Parse the given program
   * @param program - the program to parse
   * @returns - the parsed program
   * @throws - if the program is invalid
   */
  static parse(program: PVMProgram): ParsedProgram {
    return new ParsedProgram(program);
  }

  static deblob(bold_p: PVMProgramCode): ParsedProgram | PVMExitReasonImpl {
    let program: PVMProgram;
    try {
      program = PVMProgramCodec.decode(bold_p).value;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return PVMExitReasonImpl.panic();
    }
    return ParsedProgram.parse(program);
  }
}

const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  await import("@/pvm/instructions/instructions.js");
  describe("ParsedProgram", () => {
    it.skip("should instantiate the context", () => {
      const program: PVMProgram = {
        c: Buffer.from([
          0x04,
          0x07,
          0x0a, // a0 = 0x0a
          0x04,
          0x08,
          0xf6, // a1 = 0xfffffff6
          0x2b,
          0x87,
          0x04, // jump 10 if a0 >=signed a1 - branch_ge_s
          0x00, // trap,
          0x04,
          0x07,
          0xef,
          0xbe,
          0xad,
          0xde, // load_imm a0 0xdeadbeef
        ]),
        j: [] as u32[],
        k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        z: 0 as u8,
      };
      const parsed = ParsedProgram.parse(program);
      expect(parsed.skip(0 as u32)).toBe(2);
      expect(parsed.skip(3 as u32)).toBe(2);
      expect(parsed.skip(6 as u32)).toBe(2);
      expect(parsed.skip(9 as u32)).toBe(0);
      expect(parsed.skip(10 as u32)).toBe(6);
      expect(parsed.isBlockBeginning(0 as u32)).toBe(true);
      expect(parsed.isBlockBeginning(9 as u32)).toBe(true);
      expect(parsed.isBlockBeginning(10 as u32)).toBe(true);
      expect(parsed.isBlockBeginning(3 as u32)).toBe(false);

      expect(parsed.ixCacheAt(0 as u32)).toBeDefined();
      expect(parsed.ixCacheAt(1 as u32)).not.toBeDefined();
    });
    it("should fail if no ix valid at index 0", () => {
      const program: PVMProgram = {
        c: Buffer.from([0xff, 0x07, 0x0a]),
        j: [] as u32[],
        k: [1, 0, 0],
        z: 0 as u8,
      };
      expect(() => ParsedProgram.parse(program)).toThrow(
        "First instruction must be an instruction",
      );
    });
    it("should fail if k[0] is not 1", () => {
      const program: PVMProgram = {
        c: Buffer.from([0x04, 0x07, 0x0a]),
        j: [] as u32[],
        k: [0, 0, 0],
        z: 0 as u8,
      };
      expect(() => ParsedProgram.parse(program)).toThrow(
        "First instruction must be an instruction",
      );
    });
  });
}
