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
import { MemoryContent, PVMHeap, PVMMemory } from "@/pvmMemory.js";

// constants defined in $(0.6.1 - A.35)
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
 * $(0.6.1 - A.33)
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
  // $(0.6.1 - A.32) | start
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
  // $(0.6.1 - A.32) | end

  // $(0.6.1 - A.37)
  if (5 * Zz + Z_Fn(oCard) + Z_Fn(wCard + z * Zp) + Z_Fn(s) + Zi > 2 ** 32) {
    return undefined;
  }

  // registers $(0.6.1 - A.36)
  const registers = [
    2n ** 32n - 2n ** 16n,
    2n ** 32n - 2n * BigInt(Zz) - BigInt(Zi),
    0n,
    0n,
    0n,
    0n,
    0n,
    2n ** 32n - BigInt(Zz) - BigInt(Zi), // 7
    BigInt(argument.length), // 8
    0n,
    0n,
    0n,
    0n,
  ] as SeqOfLength<RegisterValue, 13>;

  const heap: PVMHeap = {
    pointer: <u32>0,
    end: <u32>0,
    start: <u32>0,
  };
  // memory $(0.6.1 - A.36)
  const acl: Map<Page, PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write> =
    new Map();
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
  // first + second
  createAcl({ from: Zz, to: Zz + P_Fn(oCard), kind: PVMMemoryAccessKind.Read });

  // third case
  {
    const offset = 2 * Zz + Z_Fn(oCard);
    mem.push({ at: <u32>offset, content: w });
    heap.start = <u32>offset;
    heap.pointer = <u32>(heap.start + w.length);
    heap.end = <u32>(offset + P_Fn(wCard) + z * Zp);
    // NOTE: this is not in graypaper but the third and fourth
    // disequations are unsolveable otherwise.
    // It only happens when oCard is 0
    if (heap.end === heap.start) {
      heap.end = <u32>(heap.end + Zp);
    }

    // third+fourth
    createAcl({
      from: heap.start,
      to: heap.end,
      kind: PVMMemoryAccessKind.Write,
    });
  }

  // fifth cas
  // seventh case
  {
    const offset = 2 ** 32 - Zz - Zi + argument.length;
    createAcl({
      from: offset,
      to: 2 ** 32 - Zz - Zi + P_Fn(argument.length),
      kind: PVMMemoryAccessKind.Write,
    });
  }
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
    // sixth + seventh
    createAcl({
      from: offset as u32,
      to: offset + P_Fn(argument.length),
      kind: PVMMemoryAccessKind.Read,
    });
  }

  const program = PVMProgramCodec.decode(c).value;
  const parsedProgram = ParsedProgram.parse(program);

  return {
    program,
    parsed: parsedProgram,
    memory: new PVMMemory(
      mem.filter((a) => a.content.length > 0), // we filter empty memory content cause it won't have acl
      acl,
      heap,
    ),
    registers,
  };
};

// $(0.6.1 - A.36)
const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.6.1 - A.36)
const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
