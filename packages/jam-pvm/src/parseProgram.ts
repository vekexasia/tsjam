import { IParsedProgram, PVMIx, PVMProgram, u32, u8 } from "@tsjam/types";
import assert from "node:assert";
import { Ixdb } from "@/instructions/ixdb.js";

export class ParsedProgram implements IParsedProgram {
  #blockBeginnings: Set<u32>;
  // $(0.6.4 - A.5)
  #ixSkips: Map<u32, u32>;
  #ixs: Map<u32, u8> = new Map<u32, u8>();

  private constructor(program: PVMProgram) {
    this.#blockBeginnings = new Set<u32>();
    this.#ixSkips = new Map<u32, u32>();
    this.#ixs = new Map<u32, u8>();

    assert(
      program.k[0] === 1 && Ixdb.byCode.has(program.c[0] as u8),
      "First instruction must be an instruction",
    );
    this.#ixs.set(0 as u32, program.c[0] as u8);
    let lastIx = 0 as u32;
    for (let i = 1; i < program.k.length; i++) {
      // if this is an instruction opcode
      if (program.k[i] === 1) {
        this.#ixs.set(i as u32, program.c[i] as u8);
        // basically the skips
        this.#ixSkips.set(lastIx, (i - lastIx - 1) as u32);
        lastIx = i as u32;
      }
    }
    // calculates skips $(0.6.4 - A.3)
    this.#ixSkips.set(lastIx, (program.k.length - lastIx - 1) as u32);
    this.#blockBeginnings.add(0 as u32);
    for (const [ix, skip] of this.#ixSkips.entries()) {
      if (Ixdb.blockTerminators.has(program.c[ix] as u8)) {
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
   * $(0.6.4 - A.19)
   */
  skip(pointer: u32): u32 {
    // we assume that the pointer is valid
    return this.#ixSkips.get(pointer)!;
  }

  isBlockBeginning(pointer: u32): boolean {
    return this.#blockBeginnings.has(pointer);
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
  await import("@/instructions/instructions.js");
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
