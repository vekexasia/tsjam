import { newSTF } from "@vekexasia/jam-utils";
import {
  AuthorizerQueue,
  Delta,
  DoubleDagger,
  Hash,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  RegularPVMExitReason,
  SafroleState,
  ServiceAccount,
  ServiceIndex,
} from "@vekexasia/jam-types";

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * (239)
 * accumulation is defined in section 12
 */
export const accumulateSTF = newSTF<null, null, null>(() => {
  return null;
});
/**
 *
 * see (256)
 */
const I_fn = (
  serviceAccount: ServiceAccount,
  service: ServiceIndex,
  iota: SafroleState["iota"],
  authQueue: AuthorizerQueue,
  dd_delta: DoubleDagger<Delta>,
): { x: PVMResultContext; y: PVMResultContext } => {
  const x: PVMResultContext = {
    serviceAccount,
    c: authQueue,
    validatorKeys: iota as unknown as PVMResultContext["validatorKeys"],
    service: check_fn(service, dd_delta),
    transfers: [],
    n: new Map(),
    // todo: fix this
    p: {
      m: service,
      a: service,
      v: service,
    },
  };
  return { x, y: { ...x } };
};

const F_fn = (
  n: FNS,
  ctx: PVMProgramExecutionContextBase,
  d: { x: PVMResultContext; y: PVMResultContext },
): null => {
  switch (n) {
    case "read":
      return null;
    case "write":
      return null;
    case "lookup":
      return null;
    case "gas":
      return null;
    case "info":
      return null;
    case "empower":
      return null;
    case "assign":
      return null;
    case "designate":
      return null;
    case "checkpoint":
      return null;
    case "new":
      return null;
    case "upgrade":
      return null;
    case "transfer":
      return null;
    case "quit":
      return null;
    case "solicit":
      return null;
    case "forget":
      return null;
  }
};

/**
 * (258)
 */
const G_fn = (
  context: PVMProgramExecutionContextBase,
  serviceAccount: ServiceAccount,
  x: { x: PVMResultContext; y: PVMResultContext },
): PVMProgramExecutionContextBase & {
  x: PVMResultContext;
  y: PVMResultContext;
} => {
  return {
    ...context,
    x: { ...x.x, serviceAccount },
    y: x.y,
  };
};

const C_fn = (
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: { x: PVMResultContext; y: PVMResultContext },
): PVMResultContext & { r?: Hash } => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return {
      ...d.y,
      r: undefined,
    };
  } else if (o.length === 32) {
    // it's an hash
    return {
      ...d.x,
      r: o as unknown as Hash,
    };
  } else {
    return {
      ...d.x,
      r: undefined,
    };
  }
};

/**
 * (260)
 */
export function check_fn(
  i: ServiceIndex,
  dd_delta: DoubleDagger<Delta>,
): ServiceIndex {
  if (dd_delta.has(i)) {
    return check_fn(
      (((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8) as ServiceIndex,
      dd_delta,
    );
  } else {
    return i;
  }
}

type FNS =
  | "read"
  | "write"
  | "lookup"
  | "gas"
  | "info"
  | "empower"
  | "assign"
  | "designate"
  | "checkpoint"
  | "new"
  | "upgrade"
  | "transfer"
  | "quit"
  | "solicit"
  | "forget";
