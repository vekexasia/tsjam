import { IParsedProgram, PVMIx, PVMProgram, u32, u8 } from "@tsjam/types";
import assert from "node:assert";
import "./instructions/instructions";
import { Ixdb } from "./instructions/ixdb";
import { applyMods } from "./functions/utils";
import { IxMod, TRAP_COST } from "./instructions/utils";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";

export class ParsedProgram implements IParsedProgram {
  #blockBeginnings: Set<u32>;
  // $(0.7.1 - A.3)
  #ixSkips: Map<u32, u32>;
  #ixs: Map<u32, u8> = new Map<u32, u8>();

  /**
   * holds just in time decoded cache for ixs
   */
  #ixDecodeCache: Map<u32 /* programcounter */, object> = new Map();

  private constructor(public rawProgram: PVMProgram) {
    this.#blockBeginnings = new Set<u32>();
    this.#ixSkips = new Map<u32, u32>();
    this.#ixs = new Map<u32, u8>();

    assert(
      rawProgram.k[0] === 1 && Ixdb.byCode.has(rawProgram.c[0] as u8),
      `First instruction must be an instruction k[0]=${rawProgram.k[0]} c[0]=${rawProgram.c[0]}`,
    );
    this.#ixs.set(0 as u32, rawProgram.c[0] as u8);
    let lastIx = 0 as u32;
    for (let i = 1; i < rawProgram.k.length; i++) {
      // if this is an instruction opcode
      if (rawProgram.k[i] === 1) {
        this.#ixs.set(i as u32, rawProgram.c[i] as u8);
        // basically the skips
        this.#ixSkips.set(lastIx, (i - lastIx - 1) as u32);
        lastIx = i as u32;
      }
    }
    // calculates skips $(0.7.1 - A.3)
    this.#ixSkips.set(lastIx, (rawProgram.k.length - lastIx - 1) as u32);
    this.#blockBeginnings.add(0 as u32);
    for (const [ix, skip] of this.#ixSkips.entries()) {
      if (Ixdb.blockTerminators.has(rawProgram.c[ix] as u8)) {
        this.#blockBeginnings.add((ix + skip + 1) as u32);
      }
    }
  }

  ixAt<K extends PVMIx<unknown>>(pointer: u32): K | undefined {
    if (!this.#ixs.has(pointer)) {
      return undefined;
    }
    return Ixdb.byCode.get(this.#ixs.get(pointer)!) as K | undefined;
  }

  /**
   * Basically computes `l`
   * $(0.7.1 - A.20)
   */
  skip(pointer: u32): u32 {
    // we assume that the pointer is valid
    return this.#ixSkips.get(pointer)!;
  }

  isBlockBeginning(pointer: u32): boolean {
    return this.#blockBeginnings.has(pointer);
  }

  /**
   * `Ψ1` | singleStep
   * it modifies the context according to the single step.
   * $(0.7.1 - A.6)
   */
  singleStep(ctx: PVMIxEvaluateFNContextImpl): PVMExitReasonImpl | undefined {
    const ix = this.ixAt(ctx.execution.instructionPointer);
    if (typeof ix === "undefined") {
      const o = applyMods(ctx.execution, {} as object, [
        IxMod.gas(TRAP_COST),
        IxMod.panic(),
      ]);
      return o;
    }

    const skip = this.skip(ctx.execution.instructionPointer) + 1;

    let args = this.#ixDecodeCache.get(ctx.execution.instructionPointer);
    if (typeof args === "undefined") {
      try {
        const byteArgs = this.rawProgram.c.subarray(
          ctx.execution.instructionPointer + 1,
          ctx.execution.instructionPointer + skip,
        );

        args = <object>ix.decode(byteArgs);
        this.#ixDecodeCache.set(ctx.execution.instructionPointer, args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.warn(`Decoding error for ${ix.identifier}`, e.message);
        const o = applyMods(ctx.execution, {} as object, [
          IxMod.skip(ctx.execution.instructionPointer, skip), //NOTE: not sure we should skip
          IxMod.gas(TRAP_COST + ix.gasCost),
          IxMod.panic(),
        ]);
        return o;
      }
    }
    const ixMods = ix.evaluate(args, ctx);

    // TODO: check if pagefault is handled correctly
    // because gp states it should return prev ixpointer but i have the feeling it is not the case in this implementation
    //
    // we apply the gas and skip.
    // if an instruction pointer is set we apply it and override the skip inside
    // the applyMods
    // $(0.7.1 - A.8)
    return applyMods(ctx.execution, {} as object, [
      IxMod.gas(ix.gasCost), // g′ = g − g∆
      IxMod.skip(ctx.execution.instructionPointer, skip), // i'
      ...ixMods,
    ]);
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
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  await import("@/pvm/instructions/instructions.js");
  describe("ParsedProgram", () => {
    it.skip("should instantiate the context", () => {
      const program: PVMProgram = {
        c: new Uint8Array([
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

      expect(parsed.ixAt(0 as u32)).toBeDefined();
      expect(parsed.ixAt(1 as u32)).not.toBeDefined();
    });
    it("should fail if no ix valid at index 0", () => {
      const program: PVMProgram = {
        c: new Uint8Array([0xff, 0x07, 0x0a]),
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
        c: new Uint8Array([0x04, 0x07, 0x0a]),
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
