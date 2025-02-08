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
import {
  bytesToBigInt,
  serviceAccountGasThreshold,
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
  toTagged,
} from "@tsjam/utils";
import { W7, W8, XMod, YMod } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import { check_fn } from "@/utils/check_fn";
import { toSafeMemoryAddress } from "@/pvmMemory";

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
                  bless: Number(m) as ServiceIndex,
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
      const p_y = x;
      const gasAfter = context.gas - (this.gasCost as bigint);
      return [IxMod.w7(gasAfter), IxMod.obj({ y: p_y })];
    },
  },
});

/**
 * `ΩN`
 * new-service host call
 */
export const omega_n = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 9 as u8,
    identifier: "new",
    gasCost: 10n as Gas,
    execute(context, x) {
      const [o, l, g, m] = context.registers.slice(7);

      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const c: ServiceAccount["codeHash"] = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      const a: ServiceAccount = {
        storage: new Map<Hash, Uint8Array>(),
        preimage_p: new Map<Hash, Uint8Array>(),
        preimage_l: new Map<
          Hash,
          Map<u32, u32>
        >() as unknown as ServiceAccount["preimage_l"],
        codeHash: c,
        balance: <u64>0n,
        minGasAccumulate: g as bigint as Gas,
        minGasOnTransfer: m as bigint as Gas,
      };
      const nm: Map<Tagged<u32, "length">, UpToSeq<u32, 3, "Nt">> = new Map();
      nm.set(toTagged(Number(l) as u32), toTagged([]));
      a.preimage_l.set(c, nm);

      a.balance = serviceAccountGasThreshold(a);

      const x_bold_s = x.u.delta.get(x.service)!;

      const bump = (a: ServiceIndex) =>
        2 ** 8 + ((a - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9));

      const newServiceIndex = check_fn(
        bump(x.service) as ServiceIndex,
        x.u.delta,
      );
      const s: ServiceAccount = {
        ...x_bold_s,
        balance: <u64>(x_bold_s.balance - a.balance),
      };

      if (s.balance < serviceAccountGasThreshold(x_bold_s)) {
        return [IxMod.w7(HostCallResult.CASH)];
      }
      return [
        IxMod.w7(x.service),
        IxMod.obj({
          x: {
            ...x,
            service: newServiceIndex,
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
      if (b < serviceAccountGasThreshold(x_bold_s)) {
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
      const d_i = serviceAccountItemInStorage(bold_d);
      const d_o = serviceAccountTotalOctets(bold_d);
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
      } else if (a.balance < serviceAccountGasThreshold(a)) {
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
 */
export const omega_f = regFn<[x: PVMResultContext, t: Tau], W7 | XMod>({
  fn: {
    opCode: 15 as u8,
    identifier: "forget",
    gasCost: 10n as Gas,
    execute(context, x, t) {
      const [o, _z] = context.registers.slice(7);
      const z = Number(_z) as Tagged<u32, "length">;
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const x_bold_s = x.u.delta.get(x.service)!;
      const h = HashCodec.decode(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      ).value;
      const a_l: ServiceAccount["preimage_l"] = new Map(x_bold_s.preimage_l);
      const a_p: ServiceAccount["preimage_p"] = new Map(x_bold_s.preimage_p);

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

export const omega_y = regFn<[x: PVMResultContext], W7 | XMod>({
  fn: {
    opCode: 16,
    identifier: "yield",
    gasCost: 10n as Gas,
    execute(context, x) {
      const o = context.registers[7];
      if (!context.memory.canRead(toSafeMemoryAddress(o), 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(
        context.memory.getBytes(toSafeMemoryAddress(o), 32),
      );
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: { ...x, y: h } })];
    },
  },
});
