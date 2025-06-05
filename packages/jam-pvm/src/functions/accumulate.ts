import { regFn } from "@/functions/fnsdb.js";
import {
  AuthorizerQueue,
  DeferredTransfer,
  Gas,
  Hash,
  PVMAccumulationState,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  UpToSeq,
  u32,
  u8,
  u64,
  PVMExitPanicMod,
} from "@tsjam/types";
import {
  AUTHQUEUE_MAX_SIZE,
  CORES,
  HostCallResult,
  NUMBER_OF_VALIDATORS,
  PREIMAGE_EXPIRATION,
  TRANSFER_MEMO_SIZE,
} from "@tsjam/constants";
import { E_4_int, E_8, HashCodec, ValidatorDataCodec } from "@tsjam/codec";
import { bytesToBigInt, toTagged } from "@tsjam/utils";
import { W7, W8, XMod, YMod } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import { check_fn } from "@/utils/check_fn";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { Hashing } from "@tsjam/crypto";
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";
import { G } from "vitest/dist/chunks/reporters.D7Jzd9GS.js";

/**
 * `ΩB`
 * bless service host call
 */
export const omega_b = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 5 as u8,
    identifier: "bless",
    gasCost: 10n as Gas,
    execute(context, x) {
      const [m, a, v, o, n] = context.registers.slice(7);
      if (!context.memory.canRead(toSafeMemoryAddress(o), 12 * Number(n))) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else if (m > 2 ** 32 || a > 2 ** 32 || v > 2 ** 32) {
        return [IxMod.w7(HostCallResult.WHO)];
      } else {
        const g = new Map<ServiceIndex, Gas>();
        const buf = context.memory.getBytes(
          toSafeMemoryAddress(o),
          12 * Number(n),
        );
        for (let i = 0; i < n; i++) {
          const data = buf.subarray(i * 12, (i + 1) * 12);
          const key = E_4_int.decode(data).value;
          const value = E_8.decode(data.subarray(4)).value;
          g.set(key as ServiceIndex, value as Gas);
        }
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                privServices: {
                  manager: Number(m) as ServiceIndex,
                  assign: Number(a) as ServiceIndex,
                  designate: Number(v) as ServiceIndex,
                  alwaysAccumulate: g,
                },
              },
            },
          }),
        ];
      }
    },
  },
});

/**
 * `ΩA`
 * assign core host call
 */
export const omega_a = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 6 as u8,
    identifier: "assign",
    gasCost: 10n as Gas,
    execute(context, x) {
      const [w7, o] = context.registers.slice(7);
      if (
        !context.memory.canRead(toSafeMemoryAddress(o), AUTHQUEUE_MAX_SIZE * 32)
      ) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        const c = context.memory.getBytes(
          toSafeMemoryAddress(o),
          AUTHQUEUE_MAX_SIZE * 32,
        );
        if (w7 < CORES) {
          const xc = x.u.authQueue.slice() as AuthorizerQueue;
          const nl: Hash[] = [];
          for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
            nl.push(bytesToBigInt(c.subarray(i * 32, (i + 1) * 32)));
          }
          xc[Number(w7)] = nl as AuthorizerQueue[0];

          return [
            IxMod.w7(HostCallResult.OK),
            IxMod.obj({ x: { ...x, u: { ...x.u, authQueue: xc } } }),
          ];
        } else {
          return [IxMod.w7(HostCallResult.CORE)];
        }
      }
    },
  },
});

/**
 * `ΩD`
 * designate validators host call
 */
export const omega_d = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 7 as u8,
    identifier: "designate",
    gasCost: 10n as Gas,
    execute(context, x) {
      const o = context.registers[7];
      if (!context.memory.canRead(toSafeMemoryAddress(o), 336)) {
        return [IxMod.w7(HostCallResult.OOB), IxMod.obj({ x })];
      } else {
        // implicitly by canRead `o` should be < 2**32
        const validators =
          [] as unknown as PVMAccumulationState["validatorKeys"];
        for (let i = 0n; i < NUMBER_OF_VALIDATORS; i++) {
          const c = context.memory.getBytes(
            toSafeMemoryAddress(o + 336n * i),
            336,
          );
          validators.push(ValidatorDataCodec.decode(c).value);
        }
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({ x: { ...x, u: { ...x.u, validatorKeys: validators } } }),
        ];
      }
    },
  },
});

/**
 * `ΩC`
 * checkpoint host call
 */
export const omega_c = regFn<
  [x: PVMResultContext, y: PVMResultContext],
  W7 | W8 | YMod
>({
  fn: {
    opCode: 8 as u8,
    identifier: "checkpoint",
    gasCost: 10n as Gas,
    execute(context, x) {
      // deep clone x
      const p_y = structuredClone(x);
      const gasAfter = context.gas - (this.gasCost as bigint);
      return [IxMod.w7(gasAfter), IxMod.obj({ y: p_y })];
    },
  },
});

/**
 * `ΩN`
 * new-service host call
 */
export const omega_n = regFn<[x: PVMResultContext, tau: Tau], W7 | XMod>({
  fn: {
    opCode: 18 as u8,
    identifier: "new",
    gasCost: 10n as Gas,
    execute(context, x, tau: Tau) {
      const [o, l, g, m, f] = context.registers.slice(7);

      if (!context.memory.canRead(toSafeMemoryAddress(o), 32) || l >= 2 ** 32) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const c: ServiceAccount["codeHash"] = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      const i_star = check_fn(
        <ServiceIndex>(2 ** 8 + ((x.i - 2 ** 8 + 42) % (2 ** 32 - 2 ** 9))),
        x.u.delta,
      );

      const a = new ServiceAccountImpl(x.i);
      a.codeHash = c;
      a.preimage_l.set(c, new Map());
      a.preimage_l.get(c)!.set(l, []);
      a.minGasAccumulate = g as u64 as Gas;
      a.minGasOnTransfer = m as u64 as Gas;
      a.creationTimeSlot = tau;
      a.gratisStorageOffset = f;
      a.lastAccumulationTimeSlot = <Tau>0;
      a.parentService = x.service;
      a.balance = a.gasThreshold();

      const x_bold_s = x.u.delta.get(x.service)!;

      const s: ServiceAccount = {
        ...x_bold_s,
        balance: <u64>(x_bold_s.balance - a.balance),
      };

      if (s.balance < x_bold_s.gasThreshold()) {
        return [IxMod.w7(HostCallResult.CASH)];
      }
      return [
        IxMod.w7(x.i),
        IxMod.obj({
          x: {
            ...x,
            i: i_star,
            u: {
              ...x.u,
              delta: new Map([
                ...x.u.delta.entries(),
                [x.i, a],
                [x.service, s],
              ]),
            },
          },
        }),
      ];
    },
  },
});

/**
 * `ΩU`
 * upgrade-service host call
 */
export const omega_u = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 10 as u8,
    identifier: "upgrade",
    gasCost: 10n as Gas,
    execute(context, x) {
      const [o, g, m] = context.registers.slice(7);
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        const x_bold_s = x.u.delta.get(x.service)!;
        const x_bold_s_prime = { ...x_bold_s };

        x_bold_s_prime.codeHash = bytesToBigInt(
          context.memory.getBytes(toSafeMemoryAddress(o), 32),
        );
        x_bold_s_prime.minGasAccumulate = g as bigint as Gas;
        x_bold_s_prime.minGasOnTransfer = m as bigint as Gas;

        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                delta: new Map([
                  ...x.u.delta.entries(),
                  [x.service, x_bold_s_prime],
                ]),
              },
            },
          }),
        ];
      }
    },
  },
});

/**
 * `ΩT`
 * transfer host call
 */
export const omega_t = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 11 as u8,
    identifier: "transfer",
    gasCost: (context: PVMProgramExecutionContextBase) => {
      return (10n + context.registers[9]) as Gas;
    },
    execute(context, x) {
      const [d, a, l, o] = context.registers.slice(7);

      const bold_d = new Map<ServiceIndex, ServiceAccount>([
        ...x.u.delta.entries(),
      ]);

      const g = l as u64 as Gas;
      if (!context.memory.canRead(toSafeMemoryAddress(o), TRANSFER_MEMO_SIZE)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }

      if (!bold_d.has(Number(d) as ServiceIndex)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }

      if (l < bold_d.get(Number(d) as ServiceIndex)!.minGasOnTransfer) {
        return [IxMod.w7(HostCallResult.LOW)];
      }
      const x_bold_s = x.u.delta.get(x.service)!;
      const b = x_bold_s.balance - a;
      if (b < x_bold_s.gasThreshold()) {
        return [IxMod.w7(HostCallResult.CASH)];
      }

      const t: DeferredTransfer = {
        sender: x.service,
        destination: Number(d) as ServiceIndex,
        amount: toTagged(a),
        gasLimit: g as Gas,
        memo: toTagged(
          context.memory.getBytes(toSafeMemoryAddress(o), TRANSFER_MEMO_SIZE),
        ),
      };

      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            transfer: x.transfer.slice().concat([t]),
            u: {
              ...x.u,
              delta: new Map([
                ...x.u.delta.entries(),
                [x.service, { ...x_bold_s, balance: b as bigint as u64 }],
              ]),
            },
          },
        }),
      ];
    },
  },
});

/**
 * `ΩQ`
 * query-service host call
 */
export const omega_j = regFn<[x: PVMResultContext, t: Tau], W7 | XMod>({
  fn: {
    opCode: 12 as u8,
    identifier: "eject",
    gasCost: 10n as Gas,
    execute(context, x, t) {
      const [_d, o] = context.registers.slice(7);
      const d: ServiceIndex = Number(_d) as ServiceIndex;

      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      const bold_d = x.u.delta.get(Number(d) as ServiceIndex);
      // NOTE: the last check on codehash is probably wrong :) graypaper states E_32(x.service)but it does not make sense
      if (
        typeof bold_d === "undefined" ||
        d !== x.service ||
        bold_d.codeHash !== BigInt(x.service)
      ) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const d_i = bold_d.itemInStorage();
      const d_o = bold_d.totalOctets();
      const l = <u32>Number((d_o > 81 ? d_o : 81n) - 81n);
      const dlhl = bold_d.preimage_l.get(h)?.get(toTagged(l));

      if (d_i !== 2 || typeof dlhl === "undefined") {
        return [IxMod.w7(HostCallResult.HUH)];
      }
      const [, y] = dlhl;
      if (dlhl.length === 2 && y < t - PREIMAGE_EXPIRATION) {
        const d_prime = new Map(x.u.delta);
        d_prime.delete(d);
        const s_prime = { ...x.u.delta.get(x.service)! };
        s_prime.balance = (s_prime.balance + bold_d.balance) as bigint as u64;
        d_prime.set(x.service, s_prime);
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({ x: { ...x, u: { ...x.u, delta: d_prime } } }),
        ];
      }
      return [IxMod.w7(HostCallResult.HUH)];
    },
  },
});

/**
 * `ΩQ`
 * query-service host call
 */
export const omega_q = regFn<[x: PVMResultContext], W7 | W8>({
  fn: {
    opCode: 13 as u8,
    identifier: "query",
    gasCost: 10n as Gas,
    execute(context, x) {
      const [o, z] = context.registers.slice(7);

      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }

      const h: Hash = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      const x_bold_s = x.u.delta.get(x.service)!;
      const a = x_bold_s.preimage_l.get(h)?.get(toTagged(Number(z) as u32));
      if (typeof a === "undefined") {
        return [IxMod.w7(HostCallResult.NONE), IxMod.w8(0)];
      }
      const [_x, y, _z] = a.map((x) => BigInt(x));
      switch (a.length) {
        case 0:
          return [IxMod.w7(0), IxMod.w8(0)];
        case 1:
          return [IxMod.w7(1n + 2n ** 32n * _x), IxMod.w8(0)];
        case 2:
          return [IxMod.w7(2n + 2n ** 32n * _x), IxMod.w8(y)];
        default:
          return [IxMod.w7(3n + 2n ** 32n * _x), IxMod.w8(y + 2n ** 32n * _z)];
      }
    },
  },
});

/**
 * `ΩS`
 * solicit-preimage host call
 */
export const omega_s = regFn<[x: PVMResultContext, t: Tau], W7 | XMod>({
  fn: {
    opCode: 14 as u8,
    identifier: "solicit",
    gasCost: 10n as Gas,
    execute(context, x, tau) {
      const [o, z] = context.registers.slice(7);
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      const x_bold_s = x.u.delta.get(x.service)!;
      const a_l: ServiceAccount["preimage_l"] = new Map(x_bold_s.preimage_l);
      if (typeof a_l.get(h)?.get(toTagged(Number(z) as u32)) === "undefined") {
        a_l.set(h, new Map([[toTagged(Number(z) as u32), toTagged([])]]));
      } else {
        a_l
          .get(h)!
          .get(toTagged(Number(z) as u32))!
          .push(tau);
      }
      const a: ServiceAccount = {
        ...x_bold_s,
        preimage_l: a_l,
      };
      const newL = a_l.get(h)!.get(toTagged(Number(z) as u32))!.length;
      if (newL !== 3 && newL !== 0) {
        // third case of `a`
        // we either have 1 or 2 elements or more than 3
        return [IxMod.w7(HostCallResult.HUH)];
      } else if (a.balance < a.gasThreshold()) {
        return [IxMod.w7(HostCallResult.FULL)];
      } else {
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                delta: new Map([...x.u.delta.entries(), [x.service, a]]),
              },
            },
          }),
        ];
      }
    },
  },
});

/**
 * `ΩF`
 * forget preimage host call
 *
 */
export const omega_f = regFn<
  [x: PVMResultContext, t: Tau],
  PVMExitPanicMod | W7 | XMod
>({
  fn: {
    opCode: 15 as u8,
    identifier: "forget",
    gasCost: 10n as Gas,
    execute(context, x, t) {
      const [o, _z] = context.registers.slice(7);
      const z = Number(_z) as Tagged<u32, "length">;
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.panic()];
      }
      const x_bold_s = x.u.delta.get(x.service)!;
      const h = HashCodec.decode(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      ).value;
      const a_l: ServiceAccount["preimage_l"] = new Map(x_bold_s.preimage_l);
      const a_p: ServiceAccount["preimage_p"] = new Map(x_bold_s.preimage_p);

      if (typeof x_bold_s.preimage_l.get(h) === "undefined") {
        return [IxMod.w7(HostCallResult.HUH)];
      }

      const xslhz = x_bold_s.preimage_l.get(h)?.get(z);

      if (typeof xslhz === "undefined") {
        // means we have `h` but no `z`
        if (a_l.get(h)?.size === 0) {
          a_l.delete(h);
        }
        a_p.delete(h);
      } else {
        const [x, y, w] = xslhz;
        if (xslhz.length === 2 && y < t - PREIMAGE_EXPIRATION) {
          a_l.get(h)!.delete(z);
          if (a_l.get(h)!.size === 0) {
            a_l.delete(h);
          }
          a_p.delete(h);
        } else if (xslhz.length === 1) {
          a_l.get(h)!.set(z, toTagged([x, t]));
        } else if (xslhz.length === 3 && y < t - PREIMAGE_EXPIRATION) {
          a_l.get(h)!.set(z, toTagged([w, t]));
        } else {
          return [IxMod.w7(HostCallResult.HUH)];
        }
      }
      /*
      if (a_l.get(h)?.get(z)?.length === 1) {
        a_l.get(h)!.get(z)!.push(t);
      } else if (a_l.get(h)?.get(z)?.length === 3) {
        const [x, y] = a_l.get(h)!.get(z)!;
        if (y < t - PREIMAGE_EXPIRATION) {
          // last bracket
          a_l.get(h)!.set(z, toTagged([x, y, t]));
        } else {
          return [IxMod.w7(HostCallResult.HUH)];
        }
      } else if (a_l.get(h)?.get(z)?.length === 2) {
        const [, y] = a_l.get(h)!.get(z)!;
        if (y < t - PREIMAGE_EXPIRATION) {
          a_l.get(h)!.delete(z);
          if (a_l.get(h)!.size === 0) {
            a_l.delete(h);
          }
          a_p.delete(h);
        } else {
          return [IxMod.w7(HostCallResult.HUH)];
        }
      } else if (a_l.get(h)?.get(z)?.length !== 0) {
        return [IxMod.w7(HostCallResult.HUH)];
      } else {
        // zero length or undefined
        a_p.delete(h);
      }
*/
      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            u: {
              ...x.u,
              delta: new Map([
                ...x.u.delta.entries(),
                [
                  x.service,
                  {
                    ...x.u.delta.get(x.service)!,
                    preimage_l: a_l,
                    preimage_p: a_p,
                  },
                ],
              ]),
            },
          },
        }),
      ];
    },
  },
});

export const omega_y = regFn<
  [x: PVMResultContext],
  PVMExitPanicMod | W7 | XMod
>({
  fn: {
    opCode: 16,
    identifier: "yield",
    gasCost: 10n as Gas,
    execute(context, x) {
      const o = context.registers[7];
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.panic()];
      }
      const h = HashCodec.decode(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      ).value;
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: { ...x, y: h } })];
    },
  },
});

export const omega_aries = regFn<
  [x: PVMResultContext, s: ServiceIndex],
  PVMExitPanicMod | W7 | XMod
>({
  fn: {
    opCode: 27,
    identifier: "provide",
    gasCost: 10n as Gas,
    execute(context, x, s) {
      const [o, _z] = context.registers.slice(8);
      const z = Number(_z) as Tagged<u32, "length">;
      const w7 = context.registers[7];
      const bold_d = x.u.delta;
      let s_star = <ServiceIndex>Number(w7);
      if (w7 === 2n ** 64n - 1n) {
        s_star = s;
      }
      if (!context.memory.canRead(toSafeMemoryAddress(o), z)) {
        return [IxMod.panic()];
      }

      const bold_i = context.memory.getBytes(toSafeMemoryAddress(o), z);
      const bold_a = bold_d.get(s_star);

      if (typeof bold_a === "undefined") {
        return [IxMod.w7(HostCallResult.WHO)];
      }

      if (
        bold_a.preimage_l.get(Hashing.blake2b(bold_i))?.get(z)?.length !== 0
      ) {
        return [IxMod.w7(HostCallResult.WHO)];
      }

      if (
        x.preimages.find(
          (x) =>
            x.service === s_star && Buffer.compare(x.preimage, bold_i) === 0,
        )
      ) {
        // already there
        return [IxMod.w7(HostCallResult.HUH)];
      }

      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            preimages: [
              ...x.preimages.slice(),
              {
                service: s_star,
                preimage: bold_i,
              },
            ],
          },
        }),
      ];
    },
  },
});
