import { HashCodec } from "@/codecs/misc-codecs";
import { AccumulationOutImpl } from "@/impls/accumulation-out-impl";
import { DeferredTransfersImpl } from "@/impls/deferred-transfers-impl";
import { JamEntropyImpl } from "@/impls/jam-entropy-impl";
import { AccumulationInputInpl } from "@/impls/pvm/accumulation-input-impl";
import { PVMAccumulationStateImpl } from "@/impls/pvm/pvm-accumulation-state-impl";
import { PVMResultContextImpl } from "@/impls/pvm/pvm-result-context-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { TauImpl } from "@/impls/slot-impl";
import { WorkOutputImpl } from "@/impls/work-output-impl";
import { createCodec, E_4_int, E_int, encodeWithCodec } from "@tsjam/codec";
import {
  HostCallResult,
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
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./host-call";
import { check_fn, PVM } from "@tsjam/pvm-base";
import { IxMod } from "@tsjam/pvm-js";

const AccumulateArgsCodec = createCodec<{
  t: u32;
  s: ServiceIndex;
  bold_i_length: number;
}>([
  ["t", E_int<u32>()],
  ["s", E_int<ServiceIndex>()],
  ["bold_i_length", E_int()],
]);

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * $(0.7.1 - B.9)
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
    p_eta_0: Posterior<JamEntropyImpl["_0"]>;
  },
): AccumulationOutImpl => {
  const iRes = I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau);
  const yRes = iRes.clone();
  const bold_c = pvmAccState.accounts.get(s)?.code();

  // first case
  if (typeof bold_c === "undefined" || bold_c.length > SERVICECODE_MAX_SIZE) {
    const newPostState = pvmAccState; // no need to clone
    const acc = newPostState.accounts.get(s)!;
    // we update to all incoming transfer amounts
    // bold_s and bold_x calculations
    acc.balance = <Balance>(acc.balance +
      accumulateOps
        .filter((a) => a.isTransfer())
        .map((x) => x.transfer.amount)
        .reduce((a, b) => a + b, 0n));

    return new AccumulationOutImpl({
      postState: newPostState,
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
      t: t.value,
      s,
      bold_i_length: accumulateOps.length,
    }),
    F_fn(t, deps.core, accumulateOps, deps.p_eta_0, s),
    { x: iRes, y: yRes },
  );

  return C_fn(mres.gasUsed, mres.res, mres.out);
};

/**
 * $(0.7.0 - B.10)
 */
const I_fn = (
  pvmAccState: PVMAccumulationStateImpl, // bold_e
  service: ServiceIndex, // s
  p_eta_0: Posterior<JamEntropyImpl["_0"]>,
  p_tau: Validated<Posterior<TauImpl>>,
): PVMResultContextImpl => {
  const d = pvmAccState.accounts.clone();
  d.delete(service);
  const newServiceIndex = <ServiceIndex>((E_4_int.decode(
    Hashing.blake2b(
      encodeWithCodec(
        createCodec<{ s: ServiceIndex; p_eta_0: Hash; tau: u32 }>([
          ["s", E_int<ServiceIndex>()],
          ["p_eta_0", HashCodec],
          ["tau", E_int<u32>()],
        ]),
        { s: service, p_eta_0, tau: p_tau.value },
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
    state: pvmAccState.clone(),
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
  accumulateOps: AccumulationInputInpl[], // bold_i
  p_eta_0: Posterior<JamEntropy["_0"]>,
  serviceIndex: ServiceIndex,
) => HostCallExecutor<{ x: PVMResultContextImpl; y: PVMResultContextImpl }> =
  (
    tau: TauImpl,
    core: CoreIndex,
    accumulateOps: AccumulationInputInpl[], // bold_i
    p_eta_0: Posterior<JamEntropy["_0"]>,
    serviceIndex: ServiceIndex,
  ) =>
  (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    const bold_s = input.out.x.bold_s();
    const e_bold_d = input.out.x.state.accounts;
    switch (fnIdentifier) {
      case "read": {
        const exitReason = applyMods(
          input.pvm,
          input.out,
          hostFunctions.read(input.pvm, {
            bold_s,
            s: input.out.x.id,
            bold_d: e_bold_d,
          }),
        );
        // apply mods in G
        G_fn(input, bold_s);
        return exitReason;
      }
      case "fetch": {
        const m = applyMods(
          input.pvm,
          input.out,
          hostFunctions.fetch(input.pvm, {
            n: p_eta_0,
            // We know that this is out of 0.7.0 spec as
            // gp at 0.7.0 sets bold_o to operand and input does not exist.
            // but this is easy enough in the number of requested changes
            bold_o: accumulateOps
              .filter((a) => a.isOperand())
              .map((a) => a.operand!),
          }),
        );
        G_fn(input, bold_s);
        return m;
      }
      case "write": {
        const out = { bold_s };
        const m = applyMods<{ bold_s: ServiceAccountImpl }>(
          input.pvm,
          out,
          hostFunctions.write(input.pvm, {
            bold_s,
            s: input.out.x.id,
          }),
        );
        // G_fn(m.ctx, m.out.bold_s, input.out);
        // bold_s is modified within applyMods
        // most likely the instance is changed
        G_fn(input, out.bold_s);
        return m;
      }
      case "lookup": {
        const m = applyMods(
          input.pvm,
          input.out,
          hostFunctions.lookup(input.pvm, {
            bold_s,
            s: input.out.x.id,
            bold_d: e_bold_d,
          }),
        );
        G_fn(input, bold_s);
        return m;
      }
      case "gas": {
        const m = applyMods(
          input.pvm,
          input.out,
          hostFunctions.gas(input.pvm, undefined),
        );
        G_fn(input, bold_s);
        return m;
      }
      case "info": {
        const m = applyMods(
          input.pvm,
          input.out,
          hostFunctions.info(input.pvm, {
            bold_d: e_bold_d,
            s: input.out.x.id,
          }),
        );
        G_fn(input, bold_s);
        return m;
      }
      case "bless":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.bless(input.pvm, input.out.x),
        );

      case "assign":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.assign(input.pvm, input.out.x),
        );

      case "designate":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.designate(input.pvm, input.out.x),
        );
      case "checkpoint":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.checkpoint(input.pvm, input.out.x),
        );
      case "new":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.new(input.pvm, { x: input.out.x, tau }),
        );
      case "upgrade":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.upgrade(input.pvm, input.out.x),
        );
      case "transfer":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.transfer(input.pvm, input.out.x),
        );
      case "eject":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.eject(input.pvm, { x: input.out.x, tau }),
        );
      case "query":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.query(input.pvm, input.out.x),
        );
      case "solicit":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.solicit(input.pvm, { x: input.out.x, tau }),
        );
      case "forget":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.forget(input.pvm, { x: input.out.x, tau }),
        );
      case "yield":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.yield(input.pvm, input.out.x),
        );
      case "provide":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.provide(input.pvm, { x: input.out.x, s: serviceIndex }),
        );
      case "log":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.log(input.pvm, { core, serviceIndex }),
        );
    }

    return applyMods(input.pvm, input.out, [
      IxMod.gas(10n),
      IxMod.w7(HostCallResult.WHAT),
    ]);
  };

/**
 * $(0.7.1 - B.12)
 */
const G_fn = (
  data: {
    pvm: PVM;
    out: { x: PVMResultContextImpl; y: PVMResultContextImpl };
  },
  serviceAccount: ServiceAccountImpl,
): undefined => {
  const x_star = data.out.x.clone();
  x_star.state.accounts.set(data.out.x.id, serviceAccount);
  data.out.x = x_star;
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
