import { Zp } from "@tsjam/constants";
import {
  IPVMMemory,
  Page,
  PVMMemoryAccessKind,
  PVMProgram,
  RegisterValue,
  SeqOfLength,
  u32,
} from "@tsjam/types";
import { E_sub_int, PVMProgramCodec, E_4_int, createCodec } from "@tsjam/codec";
import { ParsedProgram } from "@/parseProgram.js";
import { MemoryContent, PVMMemory } from "@/pvmMemory.js";

// constants defined in $(0.5.4 - A.33)
const Zz = 2 ** 16;
const Zi = 2 ** 24;

const owzsCodec = createCodec<{
  oCard: number;
  wCard: number;
  z: number;
  s: number;
}>([
  ["oCard", E_sub_int(3)],
  ["wCard", E_sub_int(3)],
  ["z", E_sub_int(2)],
  ["s", E_sub_int(3)],
]);
/**
 * `Y` fn in the graypaper
 * $(0.5.4 - A.31)
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
  // $(0.5.4 - A.32) | start
  const {
    readBytes: offset,
    value: { oCard, wCard, z, s },
  } = owzsCodec.decode(encodedProgram);

  const o = encodedProgram.subarray(offset, offset + oCard);
  const w = encodedProgram.subarray(offset + oCard, offset + oCard + wCard);

  const cCard = E_4_int.decode(
    encodedProgram.subarray(offset + oCard + wCard, offset + oCard + wCard + 4),
  );
  const c = encodedProgram.subarray(
    offset + oCard + wCard + 4,
    offset + oCard + wCard + 4 + cCard.value,
  );
  // $(0.5.4 - A.32) | end

  // $(0.5.4 - A.35)
  if (5 * Zz + Z_Fn(oCard) + Z_Fn(wCard + z * Zp) + Z_Fn(s) + Zi > 2 ** 32) {
    return undefined;
  }

  // registers $(0.5.4 - A.36)
  const registers = [
    2n ** 32n - 2n ** 16n,
    2n ** 32n - 2n * BigInt(Zz) - BigInt(Zi),
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

  // memory $(0.5.4 - A.36)
  const acl: Map<Page, PVMMemoryAccessKind> = new Map();
  const mem: MemoryContent[] = [];
  const createAcl = (conf: {
    from: number;
    to: number;
    kind: PVMMemoryAccessKind.Write | PVMMemoryAccessKind.Read;
  }) => {
    for (let i = conf.from; i < conf.to; i += Zp) {
      // page, kind
      acl.set(Math.floor(i / Zp), conf.kind);
    }
  };

  // first case
  mem.push({ at: Zz as u32, content: o });
  createAcl({ from: Zz, to: Zz + oCard, kind: PVMMemoryAccessKind.Read });

  // second case
  createAcl({
    from: Zz + oCard,
    to: Zz + P_Fn(oCard),
    kind: PVMMemoryAccessKind.Read,
  });

  // third case
  {
    const offset = 2 * Zz + Z_Fn(oCard);
    mem.push({ at: <u32>offset, content: w });
    createAcl({
      from: offset,
      to: offset + wCard,
      kind: PVMMemoryAccessKind.Write,
    });
  }

  // fourth case set to zero so only ACL is needed
  createAcl({
    from: 2 * Zz + Z_Fn(oCard) + wCard,
    to: 2 * Zz + Z_Fn(oCard) + P_Fn(wCard) + z * Zp,
    kind: PVMMemoryAccessKind.Write,
  });

  // fifth case
  createAcl({
    from: 2 ** 32 - 2 * Zz - Zi - P_Fn(s),
    to: 2 ** 32 - 2 * Zz - Zi,
    kind: PVMMemoryAccessKind.Write,
  });

  // sixth case
  {
    const offset = 2 ** 32 - Zz - Zi;
    mem.push({
      at: <u32>offset,
      content: argument,
    });
    createAcl({
      from: offset as u32,
      to: offset + argument.length,
      kind: PVMMemoryAccessKind.Read,
    });
  }

  // seventh case
  {
    const offset = 2 ** 32 - Zz - Zi + argument.length;
    createAcl({
      from: offset,
      to: 2 ** 32 - Zz - Zi + P_Fn(argument.length),
      kind: PVMMemoryAccessKind.Write,
    });
  }

  const program = PVMProgramCodec.decode(c).value;
  const parsedProgram = ParsedProgram.parse(program);
  return {
    program,
    parsed: parsedProgram,
    memory: new PVMMemory(mem, acl),
    registers,
  };
};

// $(0.5.4 - A.34)
const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.5.4 - A.34)
const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
