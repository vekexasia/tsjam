import { Zp } from "@tsjam/constants";
import {
  IPVMMemory,
  Page,
  PVMMemoryAccessKind,
  PVMProgramCode,
  RegisterValue,
  SeqOfLength,
  u16,
  u24,
  u32,
} from "@tsjam/types";
import { E_sub_int, E_4_int, createCodec } from "@tsjam/codec";
import { MemoryContent, PVMHeap, PVMMemory } from "@/pvmMemory.js";

// constants defined in $(0.6.4 - A.38)
const Zz = 2 ** 16;
const Zi = 2 ** 24;

const owzsCodec = createCodec<{
  roDataLength: u24; // |o|
  rwDataLength: u24; // |w|
  rwDataPaddingPages: u16; // z
  stackSize: u24; // s
}>([
  ["roDataLength", E_sub_int<u24>(3)],
  ["rwDataLength", E_sub_int<u24>(3)],
  ["rwDataPaddingPages", E_sub_int<u16>(2)],
  ["stackSize", E_sub_int<u24>(3)],
]);

/**
 * `Y` fn in the graypaper
 * $(0.6.5 - A.36)
 * @param encodedProgram - the encoded program and memory + register data
 * @param argument - the argument to the program
 */
export const programInitialization = (
  encodedProgram: Uint8Array,
  argument: Uint8Array,
):
  | undefined
  | {
      programCode: PVMProgramCode;
      memory: IPVMMemory;
      registers: SeqOfLength<RegisterValue, 13>;
    } => {
  // $(0.6.4 - A.35) | start
  const {
    readBytes: initOffset,
    value: {
      roDataLength, // |o|
      rwDataLength, // |w|
      rwDataPaddingPages, // z
      stackSize, // s
    },
  } = owzsCodec.decode(encodedProgram);

  let offset = initOffset;

  // o
  const roData = encodedProgram.subarray(offset, offset + roDataLength);
  offset += roDataLength;

  // w
  const rwData = encodedProgram.subarray(offset, offset + rwDataLength);
  offset += rwDataLength;

  // |c|
  const programCodeLength = E_4_int.decode(
    encodedProgram.subarray(offset, offset + 4),
  );
  offset += 4;

  // c
  const programCode = <PVMProgramCode>(
    encodedProgram.subarray(offset, offset + programCodeLength.value)
  );
  offset += programCodeLength.value;

  // $(0.6.4 - A.35) | end

  // $(0.6.4 - A.40)
  if (
    5 * Zz +
      Z_Fn(roDataLength) +
      Z_Fn(rwDataLength + rwDataPaddingPages * Zp) +
      Z_Fn(stackSize) +
      Zi >
    2 ** 32
  ) {
    return undefined;
  }

  // registers $(0.6.4 - A.39)
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
  // memory $(0.6.4 - A.39)
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
  mem.push({ at: Zz as u32, content: roData });
  // first + second
  createAcl({
    from: Zz,
    to: Zz + P_Fn(roDataLength),
    kind: PVMMemoryAccessKind.Read,
  });

  // third case
  {
    const offset = 2 * Zz + Z_Fn(roDataLength);

    console.log(
      "offset",
      offset.toString(16),
      Buffer.from(rwData).toString("hex"),
    );
    mem.push({ at: <u32>offset, content: rwData });
    heap.start = <u32>offset;
    heap.pointer = <u32>(heap.start + rwDataLength);
    heap.end = <u32>(
      (offset + P_Fn(rwDataLength) + rwDataPaddingPages /* z */ * Zp)
    );
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

  // fifth case
  createAcl({
    from: 2 ** 32 - 2 * Zz - Zi - P_Fn(stackSize),
    to: 2 ** 32 - 2 * Zz - Zi,
    kind: PVMMemoryAccessKind.Write,
  });
  console.log("stack", (2 ** 32 - 2 * Zz - Zi - P_Fn(stackSize)).toString(16));

  {
    const offset = 2 ** 32 - Zz - Zi;
    console.log(
      "argument",
      offset.toString(16),
      Buffer.from(argument).toString("hex"),
    );
    // sixth case
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

  return {
    programCode,
    memory: new PVMMemory(
      mem.filter((a) => a.content.length > 0), // we filter empty memory content cause it won't have acl
      acl,
      heap,
    ),
    registers,
  };
};

// $(0.6.4 - A.39)
const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.6.4 - A.39)
const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
