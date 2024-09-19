import { regFn } from "@/functions/fnsdb.js";
import {
  AccumulateHostFNContext,
  Delta,
  DoubleDagger,
  Hash,
  PVMResultContext,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  UpToSeq,
  u32,
  u64,
  u8,
} from "@vekexasia/jam-types";
import {
  AUTHQUEUE_MAX_SIZE,
  CORES,
  HostCallResult,
  PREIMAGE_EXPIRATION,
  SERVICE_MIN_BALANCE,
  TRANSFER_MEMO_SIZE,
} from "@vekexasia/jam-constants";
import { E_4, E_8 } from "@vekexasia/jam-codec";
import {
  bytesToBigInt,
  computeServiceAccountThreshold,
  toTagged,
} from "@vekexasia/jam-utils";
import { check_fn } from "@/invocations/accumulate.js";
import { W0, W1 } from "@/functions/utils.js";

/**
 * `ΩE`
 * empower service host call
 */
export const gamma_e = regFn<
  [x: PVMResultContext],
  W0 & { xp: PVMResultContext["p"] & { g?: Map<u32, u64> } }
>({
  opCode: 5 as u8,
  identifier: "empower",
  fn: {
    gasCost: 10n,
    execute(context, x) {
      const [m, a, v, o, n] = context.registers;
      if (!context.memory.canRead(o, 12 * n)) {
        return { w0: HostCallResult.OOB, xp: x.p };
      } else {
        const g = new Map<u32, u64>();
        for (let i = 0; i < n; i++) {
          // todo:we can optimize by reading mem only once and play with subarray
          const data = context.memory.getBytes(o + 12 * i, 12);
          const key = E_4.decode(data).value;
          const value = E_8.decode(data.subarray(4)).value;
          g.set(Number(key) as u32, value as u64);
        }
        return {
          w0: HostCallResult.OK,
          xp: {
            m: m as PVMResultContext["p"]["m"],
            a: a as PVMResultContext["p"]["a"],
            v: v as PVMResultContext["p"]["v"],
            g,
          },
        };
      }
    },
  },
});

/**
 * `ΩA`
 * assign core host call
 */
export const gamma_a = regFn<
  [x: PVMResultContext],
  W0 & { x: PVMResultContext }
>({
  opCode: 6 as u8,
  identifier: "assign",
  fn: {
    gasCost: 10n,
    execute(context, x) {
      const [w0, w1] = context.registers;
      const o = w1;
      if (!context.memory.canRead(o, AUTHQUEUE_MAX_SIZE * 32)) {
        return { w0: HostCallResult.OOB, x };
      } else {
        const c = context.memory.getBytes(o, AUTHQUEUE_MAX_SIZE * 32);
        if (w0 < CORES) {
          const xc = x.c.slice() as PVMResultContext["c"];
          const nl: Hash[] = [];
          for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
            nl.push(bytesToBigInt(c.subarray(i * 32, (i + 1) * 32)));
          }
          xc[w0] = nl as PVMResultContext["c"][0];

          return { w0: HostCallResult.OK, x: { ...x, c: xc } };
        } else {
          return { w0: HostCallResult.CORE, x };
        }
      }
    },
  },
});

/**
 * `ΩD`
 * designate validators host call
 */
export const gamma_D = regFn<[x: PVMResultContext], { x: PVMResultContext }>({
  opCode: 7 as u8,
  identifier: "designate",
  fn: {
    gasCost: 10n,
    execute(context, x) {
      // TODO: implement this function
      throw new Error("Not implemented");
    },
  },
});

/**
 * `ΩC`
 * checkpoint host call
 */
export const gamma_c = regFn<
  [x: PVMResultContext, y: PVMResultContext],
  W0 & W1 & { y: PVMResultContext }
>({
  opCode: 8 as u8,
  identifier: "checkpoint",
  fn: {
    gasCost: 10n,
    execute(context, x) {
      const p_y = x;
      const gasAfter = context.gas - this.gasCost;
      return {
        w0: Number(gasAfter % 2n ** 32n),
        w1: Number(gasAfter / 2n ** 32n), // truncate should not be necessary as op is in bigint
        y: p_y,
      };
    },
  },
});

/**
 * `ΩN`
 * new-service host call
 */
export const gamma_n = regFn<
  [x: PVMResultContext, dd_delta: DoubleDagger<Delta>],
  W0 &
    Partial<{
      x_i: PVMResultContext["service"];
      x_n: PVMResultContext["n"];
      x_s_b: ServiceAccount["balance"];
    }>
>({
  opCode: 9 as u8,
  identifier: "new",
  fn: {
    gasCost: 10n,
    execute(context, x, dd_delta) {
      const [o, l, gl, gh, ml, mh] = context.registers;

      if (!context.memory.canRead(o, 32)) {
        return {
          w0: HostCallResult.OOB,
        };
      }
      const c: ServiceAccount["codeHash"] = bytesToBigInt(
        context.memory.getBytes(o, 32),
      );
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      const m = 2n ** 32n * BigInt(mh) + BigInt(ml);
      const a: ServiceAccount = {
        storage: new Map<Hash, Uint8Array>(),
        preimage_p: new Map<Hash, Uint8Array>(),
        preimage_l: new Map<
          Hash,
          Map<u32, u32>
        >() as unknown as ServiceAccount["preimage_l"],
        codeHash: c,
        balance: 0n,
        minGasAccumulate: g,
        minGasOnTransfer: m,
      };
      const nm: Map<Tagged<u32, "length">, UpToSeq<u32, 3, "Nt">> = new Map();
      nm.set(toTagged(l), toTagged([]));
      a.preimage_l.set(c, nm);

      a.balance = computeServiceAccountThreshold(a);
      const b = x.serviceAccount!.balance - a.balance;
      if (b < computeServiceAccountThreshold(x.serviceAccount!)) {
        return { w0: HostCallResult.CASH };
      }

      const bump = (a: ServiceIndex) =>
        2 ** 8 + ((a - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9));
      return {
        w0: x.service,
        x_i: check_fn(bump(x.service) as ServiceIndex, dd_delta),
        x_n: new Map([[x.service, a]]),
        x_s_b: b,
      };
    },
  },
});

/**
 * `ΩU`
 * upgrade-service host call
 */
export const gamma_u = regFn<
  [x: PVMResultContext, s: ServiceIndex],
  W0 &
    Partial<{
      _c: ServiceAccount["codeHash"];
      _g: ServiceAccount["minGasAccumulate"];
      _m: ServiceAccount["minGasOnTransfer"];
    }>
>({
  opCode: 10 as u8,
  identifier: "upgrade",
  fn: {
    gasCost: 10n,
    execute(context, x, s) {
      const [o, gh, gl, mh, ml] = context.registers;
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      const m = 2n ** 32n * BigInt(mh) + BigInt(ml);
      if (!context.memory.canRead(o, 32)) {
        return {
          w0: HostCallResult.OOB,
        };
      } else {
        return {
          w0: HostCallResult.OK,
          _c: bytesToBigInt(
            context.memory.getBytes(o, 32),
          ) as ServiceAccount["codeHash"],
          _g: g,
          _m: m,
        };
      }
    },
  },
});

export const gamma_t = regFn<
  [x: PVMResultContext, s: ServiceIndex],
  W0 &
    Partial<{
      _t: PVMResultContext["transfers"];
      _b: ServiceAccount["balance"];
    }>
>({
  opCode: 11 as u8,
  identifier: "transfer",
  fn: {
    gasCost: 10n,
    execute(context, x, s) {
      const [d, al, ah, gl, gh, o] = context.registers;
      const a = 2n ** 32n * BigInt(ah) + BigInt(al);
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      if (!context.memory.canRead(o, TRANSFER_MEMO_SIZE)) {
        return { w0: HostCallResult.OOB };
      } else {
        const memo = context.memory.getBytes(o, TRANSFER_MEMO_SIZE);

        throw new Error("waiting for clarification");
      }
    },
  },
});

/**
 * `ΩX`
 * quit-service host call
 */
export const gamma_x = regFn<
  [x: PVMResultContext, s: ServiceIndex],
  W0 &
    Partial<{
      _s: PVMResultContext["serviceAccount"];
      _t: PVMResultContext["transfers"];
    }>
>({
  opCode: 12 as u8,
  identifier: "quit",
  fn: {
    gasCost: 10n,
    execute(context, x, s) {
      const [d, o] = context.registers;
      const a =
        x.serviceAccount!.balance -
        computeServiceAccountThreshold(x.serviceAccount!) +
        SERVICE_MIN_BALANCE;
      const g = context.gas;
      if (d === s || d === 2 ** 32 - 1) {
        return {
          w0: HostCallResult.OK,
        };
      }
      // todo continue here

      throw new Error("waiting for clarification");
    },
  },
});

/**
 * `ΩS`
 * solicit-preimage host call
 */
export const gamma_s = regFn<
  [x: PVMResultContext],
  W0 & Partial<{ _s: ServiceAccount }>,
  AccumulateHostFNContext
>({
  opCode: 13 as u8,
  identifier: "solicit",
  fn: {
    gasCost: 10n,
    execute(context, x) {
      const [o, z] = context.registers;
      if (!context.memory.canRead(o, 32)) {
        return { w0: HostCallResult.OOB };
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(o, 32));
      const a_l: ServiceAccount["preimage_l"] = new Map(
        x.serviceAccount!.preimage_l,
      );
      const a: ServiceAccount = {
        ...x.serviceAccount!,
        preimage_l: a_l,
      };
      if (typeof a_l.get(h)?.get(toTagged(z)) === "undefined") {
        a_l.set(h, new Map([[toTagged(z), toTagged([])]]));
      } else {
        a_l.get(h)!.get(toTagged(z))!.push(context.tau);
      }
      const newL = a_l.get(h)!.get(toTagged(z))!.length;
      if (newL !== 3 && newL !== 0) {
        // third case of `a`
        // we either have 1 or 2 elements or more than 3
        return { w0: HostCallResult.HUH };
      } else if (a.balance < computeServiceAccountThreshold(a)) {
        return { w0: HostCallResult.FULL };
      } else {
        return { w0: HostCallResult.OK, _s: a };
      }
    },
  },
});

/**
 * `ΩF`
 * forget preimage host call
 */
export const gamma_f = regFn<
  [x: PVMResultContext, t: Tau],
  W0 & Partial<{ _s: ServiceAccount }>,
  AccumulateHostFNContext
>({
  opCode: 14 as u8,
  identifier: "forget",
  fn: {
    gasCost: 10n,
    execute(context, x, t) {
      const [o, z] = context.registers;
      if (!context.memory.canRead(o, 32)) {
        return { w0: HostCallResult.OOB };
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(o, 32));
      const a_l: ServiceAccount["preimage_l"] = new Map(
        x.serviceAccount!.preimage_l,
      );
      const a_p: ServiceAccount["preimage_p"] = new Map(
        x.serviceAccount!.preimage_p,
      );
      if (a_l.get(h)?.get(toTagged(z))?.length === 1) {
        a_l.get(h)!.get(toTagged(z))!.push(t);
      } else if (a_l.get(h)?.get(toTagged(z))?.length === 3) {
        const [x, y] = a_l.get(h)!.get(toTagged(z))!;
        if (y < t - PREIMAGE_EXPIRATION) {
          // todo: check
          a_l.get(h)!.set(toTagged(z), toTagged([x, y, t]));
        } else {
          return { w0: HostCallResult.HUH };
        }
      } else if (a_l.get(h)?.get(toTagged(z))?.length === 2) {
        const [x, y] = a_l.get(h)!.get(toTagged(z))!;
        if (y < t - PREIMAGE_EXPIRATION) {
          a_l.get(h)!.delete(toTagged(z));
          if (a_l.get(h)!.size === 0) {
            a_l.delete(h);
          }
          a_p.delete(h);
        } else {
          return { w0: HostCallResult.HUH };
        }
      } else if (a_l.get(h)?.get(toTagged(z))?.length !== 0) {
        return {
          w0: HostCallResult.HUH,
        };
      }
      return {
        w0: HostCallResult.OK,
        _s: {
          ...x.serviceAccount!,
          preimage_l: a_l,
          preimage_p: a_p,
        },
      };
    },
  },
});
