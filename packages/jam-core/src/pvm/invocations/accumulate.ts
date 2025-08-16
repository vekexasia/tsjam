import { HashCodec } from "@/codecs/misc-codecs";
import { AccumulationOutImpl } from "@/impls/accumulation-out-impl";
import { DeferredTransfersImpl } from "@/impls/deferred-transfers-impl";
import { AccumulationInputInpl } from "@/impls/pvm/accumulation-input-impl";
import { PVMAccumulationStateImpl } from "@/impls/pvm/pvm-accumulation-state-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMResultContextImpl } from "@/impls/pvm/pvm-result-context-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import { WorkOutputImpl } from "@/impls/work-output-impl";
import {
  createCodec,
  asCodec,
  E_4_int,
  E_int,
  E_sub_int,
  encodeWithCodec,
} from "@tsjam/codec";
import {
  MINIMUM_PUBLIC_SERVICE_INDEX,
  SERVICECODE_MAX_SIZE,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  Balance,
  CoreIndex,
  Gas,
  Hash,
  JamEntropy,
  Posterior,
  ServiceIndex,
  u32,
  Validated,
  WorkError,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { FnsDb } from "../functions/fnsdb";
import { hostFunctions } from "../functions/functions";
import { applyMods } from "../functions/utils";
import { check_fn } from "../utils/check-fn";
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./host-call";

const AccumulateArgsCodec = createCodec<{
  t: SlotImpl;
  s: ServiceIndex;
  bold_i_length: number;
}>([
  ["t", asCodec(SlotImpl)],
  ["s", E_int<ServiceIndex>()],
  ["bold_i_length", E_int()],
]);

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * $(0.7.1 - B.9)
 * accumulation is defined in section 12
 */
export const accumulateInvocation = (
  pvmAccState: PVMAccumulationStateImpl, // bold_e
  t: TauImpl, // t
  s: ServiceIndex, // s
  gas: Gas, // g
  accumulateOps: AccumulationInputInpl[], // bold_i
  deps: {
    core: CoreIndex;
    p_tau: Validated<Posterior<TauImpl>>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): AccumulationOutImpl => {
  const iRes = I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau);
  const yRes = structuredClone(iRes);
  const bold_c = pvmAccState.accounts.get(s)?.code();

  // first case
  if (typeof bold_c === "undefined" || bold_c.length > SERVICECODE_MAX_SIZE) {
    const bold_s = structuredClone(pvmAccState);
    bold_s.accounts.get(s)!.balance = <Balance>(pvmAccState.accounts.get(s)!
      .balance +
      BigInt(
        accumulateOps
          .filter((op) => op.isTransfer())
          .map((op) => op.transfer!.amount)
          .reduce((a, b) => a + b, 0n),
      ));

    return new AccumulationOutImpl({
      postState: bold_s,
      deferredTransfers: new DeferredTransfersImpl([]),
      yield: undefined,
      gasUsed: toTagged(0n),
      provisions: [],
    });
  }

  const mres = argumentInvocation(
    bold_c,
    5 as u32, // instructionPointer
    gas,
    encodeWithCodec(AccumulateArgsCodec, {
      t,
      s,
      bold_i_length: accumulateOps.length,
    }),
    F_fn(t, deps.core, s),
    { x: iRes, y: yRes },
  );

  return C_fn(mres.gasUsed, mres.res, mres.out);
};

/**
 * $(0.7.1 - B.10)
 */
const I_fn = (
  pvmAccState: PVMAccumulationStateImpl, // bold_e
  service: ServiceIndex, // s
  p_eta_0: Posterior<JamEntropy["_0"]>,
  p_tau: Validated<Posterior<TauImpl>>,
): PVMResultContextImpl => {
  const d = pvmAccState.accounts.clone();
  d.delete(service);
  const newServiceIndex = <ServiceIndex>((E_4_int.decode(
    Hashing.blake2b(
      encodeWithCodec(
        createCodec<{ s: ServiceIndex; p_eta_0: Hash; tau: SlotImpl }>([
          ["s", E_sub_int<ServiceIndex>(4)],
          ["p_eta_0", HashCodec],
          ["tau", asCodec(SlotImpl)],
        ]),
        { s: service, p_eta_0, tau: p_tau },
      ),
    ),
  ).value %
    (2 ** 32 - MINIMUM_PUBLIC_SERVICE_INDEX - 2 ** 8)) +
    MINIMUM_PUBLIC_SERVICE_INDEX);

  const i = check_fn(
    newServiceIndex,
    pvmAccState.accounts, // u_d
  );

  return new PVMResultContextImpl({
    id: service,
    state: structuredClone(pvmAccState),
    nextFreeID: i,
    transfers: new DeferredTransfersImpl([]),
    yield: undefined,
    provisions: [],
  });
};

/**
 * $(0.7.1 - B.11)
 */
const F_fn: (
  tau: TauImpl,
  core: CoreIndex,
  serviceIndex: ServiceIndex,
) => HostCallExecutor<{ x: PVMResultContextImpl; y: PVMResultContextImpl }> =
  (tau: TauImpl, core: CoreIndex, serviceIndex: ServiceIndex) => (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    const bold_s = input.out.x.bold_s();
    const e_bold_d = input.out.x.state.accounts;
    switch (fnIdentifier) {
      case "read": {
        const { ctx, out } = applyMods(
          input.ctx,
          input.out,
          hostFunctions.read(input.ctx, {
            bold_s,
            s: input.out.x.id,
            bold_d: e_bold_d,
          }),
        );
        return G_fn(ctx, bold_s, out);
      }
      case "write": {
        const m = applyMods<{ bold_s: ServiceAccountImpl }>(
          input.ctx,
          { bold_s },
          hostFunctions.write(input.ctx, {
            bold_s,
            s: input.out.x.id,
            bold_d: e_bold_d,
          }),
        );
        return G_fn(m.ctx, m.out.bold_s, input.out);
      }
      case "lookup": {
        const m = applyMods(
          input.ctx,
          input.out,
          hostFunctions.lookup(input.ctx, {
            bold_s,
            s: input.out.x.id,
            bold_d: e_bold_d,
          }),
        );
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "gas": {
        const m = applyMods(
          input.ctx,
          input.out,
          hostFunctions.gas(input.ctx, undefined),
        );
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "info": {
        const m = applyMods(
          input.ctx,
          input.out,
          hostFunctions.info(input.ctx, {
            bold_d: e_bold_d,
            s: input.out.x.id,
          }),
        );

        return G_fn(m.ctx, bold_s, m.out);
      }
      case "bless":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.bless(input.ctx, input.out.x),
        );

      case "assign":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.assign(input.ctx, input.out.x),
        );
      case "designate":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.designate(input.ctx, input.out.x),
        );
      case "checkpoint":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.checkpoint(input.ctx, input.out.x),
        );
      case "new":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.new(input.ctx, { x: input.out.x, tau }),
        );
      case "upgrade":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.upgrade(input.ctx, input.out.x),
        );
      case "transfer":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.transfer(input.ctx, input.out.x),
        );
      case "eject":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.eject(input.ctx, { x: input.out.x, tau }),
        );
      case "query":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.query(input.ctx, input.out.x),
        );
      case "solicit":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.solicit(input.ctx, { x: input.out.x, tau }),
        );
      case "forget":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.forget(input.ctx, { x: input.out.x, tau }),
        );
      case "yield":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.yield(input.ctx, input.out.x),
        );
      case "provide":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.provide(input.ctx, input.out.x),
        );
      case "log":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.log(input.ctx, { core, serviceIndex }),
        );
    }
    throw new Error("not implemented" + input.hostCallOpcode);
  };

/**
 * $(0.7.1 - B.12)
 */
const G_fn = (
  context: PVMProgramExecutionContextImpl,
  serviceAccount: ServiceAccountImpl,
  x: { x: PVMResultContextImpl; y: PVMResultContextImpl },
): ReturnType<
  HostCallExecutor<{ x: PVMResultContextImpl; y: PVMResultContextImpl }>
> => {
  const x_star = structuredClone(x.x);
  x_star.state.accounts.set(x.x.id, serviceAccount);
  return {
    out: { x: x_star, y: x.y },
    ctx: { ...context },
  };
};

/**
 * $(0.7.1 - B.13)
 */
const C_fn = (
  gas: Gas,
  o: WorkOutputImpl<WorkError.OutOfGas | WorkError.Panic>,
  d: { x: PVMResultContextImpl; y: PVMResultContextImpl },
): AccumulationOutImpl => {
  if (o.isPanic() || o.isOutOfGas()) {
    return new AccumulationOutImpl({
      postState: d.y.state,
      deferredTransfers: d.y.transfers,
      yield: d.y.yield,
      gasUsed: toTagged(gas),
      provisions: d.y.provisions,
    });
  } else if (o.isSuccess() && o.success.length === 32) {
    return new AccumulationOutImpl({
      postState: d.x.state,
      deferredTransfers: d.x.transfers,
      yield: HashCodec.decode(o.success).value,
      gasUsed: toTagged(gas),
      provisions: d.x.provisions,
    });
  } else {
    return new AccumulationOutImpl({
      postState: d.x.state,
      deferredTransfers: d.x.transfers,
      yield: d.x.yield,
      gasUsed: toTagged(gas),
      provisions: d.x.provisions,
    });
  }
};
