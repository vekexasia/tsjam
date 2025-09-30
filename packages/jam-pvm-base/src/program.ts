import { createCodec, E_4_int, E_sub_int } from "@tsjam/codec";
import { Zp } from "@tsjam/constants";
import {
  PVMMemoryAccessKind,
  PVMProgramCode,
  u16,
  u24,
  u32,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { PVMMemDump } from "./pvm-base";
import { PVMRegisterImpl } from "./pvm-register";
import { PVMRegistersImpl } from "./pvm-registers";

// constants defined in $(0.7.1 - A.39)
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
 * $(0.7.1 - A.37)
 * @param encodedProgram - the encoded program and memory + register data
 * @param argument - the argument to the program
 */
export const programInitialization = (
  encodedProgram: Buffer,
  argument: Buffer,
):
  | undefined
  | {
      programCode: PVMProgramCode;
      memory: PVMMemDump;
      registers: PVMRegistersImpl;
    } => {
  // $(0.7.1 - A.35) | start
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
  const roData = Buffer.from(
    encodedProgram.subarray(offset, offset + roDataLength),
  );
  offset += roDataLength;

  // w
  const rwData = Buffer.from(
    encodedProgram.subarray(offset, offset + rwDataLength),
  );
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

  // $(0.7.1 - A.35) | end

  // $(0.7.1 - A.40)
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

  // registers $(0.7.1 - A.39)
  const registers = new PVMRegistersImpl(
    toTagged(
      [
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
      ].map((x) => new PVMRegisterImpl(toTagged(x))),
    ),
  );

  const heap = {
    pointer: <u32>0,
    end: <u32>0,
    start: <u32>0,
  };
  // memory $(0.7.1 - A.39)
  const mem: PVMMemDump["pages"] = new Map();
  const createMemEntry = (conf: {
    from: number;
    to: number;
    data: Buffer;
    kind: PVMMemoryAccessKind.Write | PVMMemoryAccessKind.Read;
  }) => {
    // log(
    //   `ACL from ${conf.from.toString(16)}|${conf.from} to ${conf.to.toString(16)}|${conf.to}as ${conf.kind} - ${conf.data.length}`,
    //   true,
    // );
    for (let i = conf.from; i < conf.to; i += Zp) {
      let b = conf.data.subarray(i - conf.from, i + Zp - conf.from);
      if (b.length < Zp) {
        b = Buffer.concat([b, Buffer.alloc(Zp - b.length)]); // padding
      }
      // page, kind
      mem.set(Math.floor(i / Zp), {
        acl: conf.kind,
        data: b,
      });
    }
  };

  // first + second
  createMemEntry({
    from: Zz,
    to: Zz + P_Fn(roDataLength),
    data: roData,
    kind: PVMMemoryAccessKind.Read,
  });

  // third case
  {
    const offset = 2 * Zz + Z_Fn(roDataLength);

    const rwSectionEnd = <u32>(
      (offset + P_Fn(rwDataLength) + rwDataPaddingPages /* z */ * Zp)
    );
    // third+fourth
    // RW DAta
    createMemEntry({
      from: offset,
      to: rwSectionEnd,
      data: rwData,
      kind: PVMMemoryAccessKind.Write,
    });

    heap.start = <u32>rwSectionEnd;
    heap.pointer = heap.start;
    heap.end = heap.start;
  }

  // fifth case
  createMemEntry({
    from: 2 ** 32 - 2 * Zz - Zi - P_Fn(stackSize),
    to: 2 ** 32 - 2 * Zz - Zi,
    kind: PVMMemoryAccessKind.Write,
    data: Buffer.alloc(P_Fn(stackSize)),
  });

  {
    const offset = 2 ** 32 - Zz - Zi;
    const argBuf = Buffer.alloc(argument.length + P_Fn(argument.length));
    argument.copy(argBuf);

    // sixth + seventh
    createMemEntry({
      from: offset as u32,
      to: offset + P_Fn(argument.length),
      data: argBuf,
      kind: PVMMemoryAccessKind.Read,
    });
  }

  return {
    programCode,
    memory: {
      pages: mem,
      heap,
    },
    registers,
  };
};

// $(0.7.1 - A.40)
const P_Fn = (x: number | bigint) => {
  return Zp * Math.ceil(Number(x) / Zp);
};

// $(0.7.1 - A.40)
const Z_Fn = (x: number | bigint) => {
  return Zz * Math.ceil(Number(x) / Zz);
};
