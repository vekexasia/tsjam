import {
  IPVMMemory,
  PVMACL,
  PVMProgram,
  RegisterValue,
  SeqOfLength,
  u32,
} from "@tsjam/types";
import { E_2, E_3, E_4, IdentityCodec, PVMProgramCodec } from "@tsjam/codec";
import { ParsedProgram } from "@/parseProgram.js";
import { MemoryContent, PVMMemory } from "@/pvmMemory.js";

// constants defined in $(0.5.2 - A.31)
const Zp = 2 ** 14;
const Zz = 2 ** 16;
const Zi = 2 ** 24;

/**
 * `Y` fn in the graypaper
 * $(0.5.2 - A.29)
 * @param encodedProgram - the encoded program and memory + register data
 * @param argument - the argument to the program
 */
export const programInitialization = (
  encodedProgram: Uint8Array,
  argument: Uint8Array,
):
  | undefined
  | {
      program: PVMProgram;
      parsed: ParsedProgram;
      memory: IPVMMemory;
      registers: SeqOfLength<RegisterValue, 13>;
    } => {
  // $(0.5.2 - A.30) | start
  let offset = 0;
  const oCardinality = E_3.decode(encodedProgram.subarray(0, 3));
  offset += oCardinality.readBytes;
  const wCardinality = E_3.decode(encodedProgram.subarray(offset, offset + 3));
  offset += wCardinality.readBytes;
  const z = E_2.decode(encodedProgram.subarray(offset, offset + 2));
  offset += z.readBytes;
  const s = E_3.decode(encodedProgram.subarray(offset, offset + 3));
  offset += s.readBytes;
  const o = IdentityCodec.decode(
    encodedProgram.subarray(offset, offset + Number(oCardinality.value)),
  );
  offset += o.readBytes;

  const w = IdentityCodec.decode(
    encodedProgram.subarray(offset, offset + Number(wCardinality.value)),
  );
  offset += w.readBytes;
  const cCardinality = E_4.decode(encodedProgram.subarray(offset, offset + 4));
  offset += cCardinality.readBytes;
  const c = encodedProgram.subarray(
    offset,
    offset + Number(cCardinality.value),
  );
  // $(0.5.2 - A.30) | end

  // $(0.5.2 - A.33)
  if (
    5 * Zz +
      Z_Fn(oCardinality.value) +
      Z_Fn(wCardinality.value + z.value * BigInt(Zp)) +
      Z_Fn(s.value) +
      Zi >
    2 ** 32
  ) {
    return undefined;
  }

  // registers $(0.5.2 - A.35)
  const registers = [
    2n ** 32n - 2n ** 16n,
    2n ** 32n - 2n * BigInt(Zz - Zi),
    0n,
    0n,
    0n,
    0n,
    0n,
    2n ** 32n - BigInt(Zz - Zi), // 7
    argument.length, // 8
    0n,
    0n,
    0n,
    0n,
  ] as SeqOfLength<RegisterValue, 13>;

  // memory $(0.5.2 - A.34)
  const acl: PVMACL[] = [];
  const mem: MemoryContent[] = [];
  // first case
  mem.push({ at: Zz as u32, content: o.value });

  // we set a single acl to match both the first and second case
  // we dont need to set the memory for secodn case as it's automatically set to 0
  acl.push({
    from: Zz as u32,
    to: (Zz + Number(oCardinality.value) + P_Fn(oCardinality.value)) as u32,
    writable: false,
  });

  // third case
  const tmpoff = (2 * Zz + Z_Fn(oCardinality.value)) as u32;
  mem.push({ at: tmpoff, content: w.value });
  acl.push({
    from: tmpoff,
    to: (tmpoff + Number(wCardinality.value)) as u32,
    writable: true,
  });

  // fourth case set to zero so only ACL is needed

  acl.push({
    from: (2 * Zz +
      Z_Fn(oCardinality.value) +
      Number(wCardinality.value)) as u32,
    to: (2 * Zz +
      Z_Fn(oCardinality.value) +
      P_Fn(wCardinality.value) +
      Number(z.value) * Zp) as u32,
    writable: true,
  });

  // fifth case
  acl.push({
    from: (2 ** 32 - 2 * Zz - Zi - P_Fn(s.value)) as u32,
    to: (2 ** 32 - 2 * Zz - Zi) as u32,
    writable: true,
  });

  // sixth case
  mem.push({
    at: (2 ** 32 - Zz - Zi) as u32,
    content: argument,
  });
  acl.push({
    from: (2 ** 32 - Zz - Zi) as u32,
    to: (2 ** 32 - Zz - Zi + argument.length) as u32,
    writable: false,
  });

  // seventh case
  acl.push({
    from: (2 ** 32 - Zz - Zi + argument.length) as u32,
    to: (2 ** 32 - Zz - Zi + P_Fn(argument.length)) as u32,
    writable: true,
  });

  const program = PVMProgramCodec.decode(c).value;
  const parsedProgram = ParsedProgram.parse(program);
  return {
    program,
    parsed: parsedProgram,
    memory: new PVMMemory(mem, acl),
    registers,
  };
};

// $(0.5.2 - A.32)
const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.5.2 - A.32)
const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
