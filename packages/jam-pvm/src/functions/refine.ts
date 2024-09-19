import { regFn } from "@/functions/fnsdb.js";
import {
  ByteArrayOfLength,
  Delta,
  ExportSegment,
  Hash,
  PVMProgramExecutionContextBase,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u64,
  u8,
} from "@vekexasia/jam-types";
import { MemoryMod, W0, W1 } from "@/functions/utils.js";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  HostCallResult,
} from "@vekexasia/jam-constants";
import { bytesToBigInt, historicalLookup } from "@vekexasia/jam-utils";
import { PVMMemory } from "@/pvmMemory.js";
import { E_4, E_8, PVMProgramCodec } from "@vekexasia/jam-codec";
import { basicInvocation } from "@/invocations/basic.js";
import { ParsedProgram } from "@/parseProgram.js";
import assert from "node:assert";

type M = Map<number, { p: Uint8Array; u: PVMMemory; i: u32 }>;
type E = Array<ByteArrayOfLength<typeof ERASURECODE_EXPORTED_SIZE>>;
/**
 * `ΩH` in the graypaper
 * historical lookup preimage
 */
export const omega_h = regFn<
  [m: any, e: E, s: ServiceIndex, delta: Delta, t: Tau],
  W0 & Partial<MemoryMod>
>({
  opCode: 15 as u8,
  identifier: "historical_lookup",
  fn: {
    gasCost: 10n,
    execute(context, m, e, s: ServiceIndex, delta: Delta, t: Tau) {
      const [w0, h0, b0, bz] = context.registers;
      if (!context.memory.canWrite(b0, bz)) {
        return { w0: HostCallResult.OOB };
      }
      let a: ServiceAccount | undefined;
      if (w0 === 2 ** 32 - 1 && delta.has(s)) {
        a = delta.get(s);
      } else if (delta.has(w0 as ServiceIndex)) {
        a = delta.get(w0 as ServiceIndex);
      }
      if (typeof a === "undefined" || !context.memory.canRead(h0, 32)) {
        return { w0: HostCallResult.NONE };
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(h0, 32));
      const v = historicalLookup(a, t, h);
      if (typeof v === "undefined") {
        return { w0: HostCallResult.NONE };
      }
      return {
        w0: v.length,
        memory: {
          from: b0,
          length: Math.min(bz, v.length),
          newData: v.subarray(0, Math.min(bz, v.length)),
        },
      };
    },
  },
});

/**
 * `ΩY` in the graypaper
 * import segment host cal
 */
export const omega_y = regFn<[i: ExportSegment[]], W0 & Partial<MemoryMod>>({
  opCode: 16 as u8,
  identifier: "import",
  fn: {
    gasCost: 10n,
    execute(context, i) {
      const [w0, o, w2] = context.registers;
      if (w0 >= i.length) {
        return { w0: HostCallResult.NONE };
      }
      const v = i[w0];
      const l = Math.min(
        w2,
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );

      if (!context.memory.canWrite(o, l)) {
        return { w0: HostCallResult.OOB };
      }
      return {
        w0: HostCallResult.OK,
        memory: {
          from: o,
          length: l,
          newData: v,
        },
      };
    },
  },
});

/**
 * `ΩZ` in the graypaper
 * export segment host call
 */
export const omega_z = regFn<
  [e: E, segmentOffset: number],
  W0 & Partial<{ e: E }>
>({
  opCode: 17 as u8,
  identifier: "export",
  fn: {
    gasCost: 10n,
    execute(context, e, offset) {
      const [p, w1] = context.registers;
      const z = Math.min(
        w1,
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );
      if (!context.memory.canRead(p, z)) {
        return { w0: HostCallResult.OOB };
      }
      if (offset + e.length >= 11 /* Wx */) {
        return { w0: HostCallResult.FULL };
      }
      const x = new Uint8Array(
        Math.ceil(z / (ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE)),
      ).fill(0);
      x.set(context.memory.getBytes(p, z));
      return {
        w0: offset + e.length,
        e: [...e.slice(), x] as E,
      };
    },
  },
});

/**
 * `ΩM` in the graypaper
 *  Make PVM host call
 */
export const omega_m = regFn<[m: M], W0 & Partial<{ m: M }>>({
  opCode: 18 as u8,
  identifier: "machine",
  fn: {
    gasCost: 10n,
    execute(context, m) {
      const [p0, pz, i] = context.registers;
      if (!context.memory.canWrite(p0, pz)) {
        return { w0: HostCallResult.OOB };
      }
      const p = context.memory.getBytes(p0, pz);
      const sortedKeys = [...m.keys()].sort((a, b) => a - b);
      let n = 0;
      while (sortedKeys.length > 0 && n == sortedKeys[0]) {
        sortedKeys.shift()!;
        n++;
      }
      const mem = new PVMMemory([], []);
      const newM = new Map(m);
      newM.set(n, { p, u: mem, i });
      return {
        w0: n, // new Service index?
        m: newM,
      };
    },
  },
});

/**
 * `ΩP` in the graypaper
 * Peek PVM host call
 */
export const omega_p = regFn<[m: M], W0 & Partial<MemoryMod>>({
  opCode: 19 as u8,
  identifier: "peek",
  fn: {
    gasCost: 10n,
    execute(context, m) {
      const [n, a, b, l] = context.registers;
      if (!m.has(n)) {
        return { w0: HostCallResult.WHO };
      }
      if (!m.get(n)!.u.canRead(b, l)) {
        return { w0: HostCallResult.OOB };
      }
      if (!context.memory.canWrite(a, l)) {
        return { w0: HostCallResult.OOB };
      }

      return {
        w0: HostCallResult.OK,
        memory: {
          from: a,
          length: l,
          newData: m.get(n)!.u.getBytes(b, l),
        },
      };
    },
  },
});

/**
 * `ΩO` in the graypaper
 * Poke PVM host call
 */
export const omega_o = regFn<[m: M], W0 & Partial<{ m: M }>>({
  opCode: 20 as u8,
  identifier: "poke",
  fn: {
    gasCost: 10n,
    execute(context, m) {
      const [n, a, b, l] = context.registers;
      if (!m.has(n)) {
        return { w0: HostCallResult.WHO };
      }
      const u = m.get(n)!.u;

      if (!context.memory.canRead(a, l)) {
        return { w0: HostCallResult.OOB };
      }
      const s = context.memory.getBytes(a, l);

      if (!context.memory.canRead(a, l)) {
        return { w0: HostCallResult.OOB };
      }
      const p_u = u.clone();
      p_u.addACL({ from: b, to: (b + l) as u32, writable: true });
      p_u.setBytes(b, s);
      const p_m = new Map(m);
      p_m.set(n, { p: m.get(n)!.p, u: p_u, i: m.get(n)!.i });

      return {
        w0: HostCallResult.OK,
        m: p_m,
      };
    },
  },
});

/**
 * `ΩK` in the graypaper
 * kick off pvm host call
 */
export const omega_k = regFn<[m: M], W0 & Partial<MemoryMod & W1 & { m: M }>>({
  opCode: 21 as u8,
  identifier: "invoke",
  fn: {
    gasCost: 10n,
    execute(context: PVMProgramExecutionContextBase, m) {
      const [n, o] = context.registers;
      if (!context.memory.canWrite(o, 60)) {
        return { w0: HostCallResult.OOB };
      }
      if (!m.has(n)) {
        return { w0: HostCallResult.WHO };
      }
      const g = E_8.decode(context.memory.getBytes(o, 8)).value;
      // registers
      const w = new Array(13)
        .fill(0)
        .map((_, i) =>
          Number(E_4.decode(context.memory.getBytes(o + 8 + 4 * i, 4)).value),
        );
      const program = PVMProgramCodec.decode(m.get(n)!.p).value;
      const parsed = ParsedProgram.parse(program);

      const pvmCtx = {
        instructionPointer: m.get(n)!.i,
        gas: g as u64,
        registers: w as PVMProgramExecutionContextBase["registers"],
        memory: m.get(n)!.u.clone(),
      };
      const res = basicInvocation.apply(
        {
          program: PVMProgramCodec.decode(m.get(n)!.p).value,
          parsedProgram: parsed,
        },
        pvmCtx,
      );

      // compute u*
      const newMemory = {
        from: o,
        length: 60,
        newData: new Uint8Array(60),
      };
      E_8.encode(pvmCtx.gas, newMemory.newData.subarray(0, 8));
      w.forEach((v, i) =>
        E_4.encode(BigInt(v), newMemory.newData.subarray(8 + 4 * i, 4)),
      );

      // compute m*
      const mStar = new Map(m);
      mStar.set(n, {
        p: m.get(n)!.p,
        u: pvmCtx.memory,
        i: m.get(n)!.i, // fixme: this is not computed
      });

      assert(typeof res.exitReason !== "undefined", "exit reason is undefined");
      if (typeof res.exitReason === "number") {
        return {
          w0: res.exitReason,
          memory: newMemory,
          m: mStar,
        };
      } else if (res.exitReason.type === "host-call") {
        return {
          w0: 0, // fixme: "host",
          w1: res.exitReason.h,
          memory: newMemory,
          m: mStar,
        };
      } else {
        return {
          w0: 1, // fixme: "fault",
          w1: res.exitReason.memoryLocationIn,
          memory: newMemory,
          m: mStar,
        };
      }
    },
  },
});

/**
 * `ΩX` in the graypaper
 * expunge PVM host call
 */
export const omega_x = regFn<[m: M], W0 & Partial<{ m: M }>>({
  opCode: 22 as u8,
  identifier: "expunge",
  fn: {
    gasCost: 10n,
    execute(context, m) {
      const [n] = context.registers;
      if (!m.has(n)) {
        return { w0: HostCallResult.WHO };
      }
      const entry = m.get(n)!;
      const newM = new Map(m);
      newM.delete(n);
      return {
        w0: entry.i,
        m: newM,
      };
    },
  },
});
