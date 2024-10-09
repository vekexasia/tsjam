import { IPVMMemory, PVMProgram, SeqOfLength, u32 } from "@tsjam/types";
import { E_2, E_3, E_4, IdentityCodec, PVMProgramCodec } from "@tsjam/codec";
import { ParsedProgram } from "@/parseProgram.js";
import { ACL, MemoryContent, PVMMemory } from "@/pvmMemory.js";

// constants defined in (242)
const Zp = 2 ** 14;
const Zq = 2 ** 16;
const Zi = 2 ** 24;

/**
 * `Y` fn in the graypaper
 * see (257)
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
      registers: SeqOfLength<u32, 13>;
    } => {
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
  if (
    5 * Zq +
      Q_Fn(oCardinality.value) +
      Q_Fn(wCardinality.value + z.value * BigInt(Zp)) +
      Q_Fn(s.value) +
      Zi >
    2 ** 32
  ) {
    return undefined;
  }

  // registers (246)
  const registers = [
    2 ** 32 - 2 ** 16,
    2 ** 32 - 2 * Zq - Zi,
    0,
    0,
    0,
    0,
    0,
    2 ** 32 - Zq - Zi, // 7
    argument.length, // 8
    0,
    0,
    0,
    0,
  ] as SeqOfLength<u32, 13>;

  // memory (245)
  const acl: ACL[] = [];
  const mem: MemoryContent[] = [];
  // first case
  mem.push({ at: Zq as u32, content: o.value });
  // we set a single acl to match both the first and second case
  // we dont need to set the memory for secodn case as it's automatically set to 0
  acl.push({
    from: Zq as u32,
    to: (Zq + Number(oCardinality.value) + P_Fn(oCardinality.value)) as u32,
    writable: false,
  });

  // third case
  const tmpoff = (2 * Zq + Q_Fn(oCardinality.value)) as u32;
  mem.push({ at: tmpoff, content: w.value });
  acl.push({
    from: tmpoff,
    to: (tmpoff + Number(wCardinality.value)) as u32,
    writable: true,
  });

  // fourth case set to zero so only ACL is needed

  acl.push({
    from: (2 * Zq +
      Q_Fn(oCardinality.value) +
      Number(wCardinality.value)) as u32,
    to: (2 * Zq +
      Q_Fn(oCardinality.value) +
      P_Fn(wCardinality.value) +
      Number(z.value) * Zp) as u32,
    writable: true,
  });

  // fifth case
  acl.push({
    from: (2 ** 32 - 2 * Zq - Zi - P_Fn(s.value)) as u32,
    to: (2 ** 32 - 2 * Zq - Zi) as u32,
    writable: true,
  });

  // sixth case
  mem.push({
    at: (2 ** 32 - Zq - Zi) as u32,
    content: argument,
  });
  acl.push({
    from: (2 ** 32 - Zq - Zi) as u32,
    to: (2 ** 32 - Zq - Zi + argument.length) as u32,
    writable: false,
  });

  // seventh case
  acl.push({
    from: (2 ** 32 - Zq - Zi + argument.length) as u32,
    to: (2 ** 32 - Zq - Zi + P_Fn(argument.length)) as u32,
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

const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

const Q_Fn = (x: number | bigint) => {
  return Zq * Math.ceil(Number(x) / Zq);
};
