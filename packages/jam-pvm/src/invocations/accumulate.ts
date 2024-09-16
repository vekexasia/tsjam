import { newSTF } from "@vekexasia/jam-utils";
import {
  AuthorizerQueue,
  Delta,
  DoubleDagger,
  Hash,
  IPVMMemory,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
  SafroleState,
  SeqOfLength,
  ServiceAccount,
  ServiceIndex,
  ValidatorData,
  u32,
} from "@vekexasia/jam-types";
import {
  AUTHQUEUE_MAX_SIZE,
  CORES,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-constants";

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * (239)
 * accumulation is defined in section 12
 */
export const accumulateSTF = newSTF<null, null, null>(() => {
  return null;
});
type X = {
  /**
   * `s`
   */
  serviceAccount?: ServiceAccount;
  /**
   * `c` asically the AuthorizerQueue
   */
  c: SeqOfLength<SeqOfLength<Hash, typeof AUTHQUEUE_MAX_SIZE>, typeof CORES>;
  /**
   * `v`
   */
  validatorKeys: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS>;
  /**
   * `i`
   */
  service: ServiceIndex;
  /**
   * `t`
   */
  transfers: any; // todo
  /**
   * `n`
   */
  n: Map<ServiceIndex, ServiceAccount>;

  p: {
    /**
     * `m`
     */
    m: ServiceAccount;
    /**
     * `a`
     */
    a: ServiceIndex;
    /**
     * `v`
     */
    v: ServiceIndex;
  };
};
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
): XxX => {
  const x: X = {
    serviceAccount,
    c: authQueue,
    validatorKeys: iota as unknown as X["validatorKeys"],
    service: check_fn(service, dd_delta),
    transfers: [],
    n: new Map(),
    p: {
      m: serviceAccount,
      a: service,
      v: service,
    },
  };
  return [x, x];
};
const F_fn = (n: FNS, ctx: LimitedPVMContext, d: [x: X, y: X]): null => {
  throw new Error("Not implemented");
};
/**
 * (258)
 */
const G_fn = (
  context: LimitedPVMContext,
  serviceAccount: ServiceAccount,
  x: [x: X, y: X],
): LimitedPVMContext & { x: XxX } => {
  return {
    ...context,
    x: [{ ...x[0], serviceAccount }, x[1]],
  };
};

const C_fn = (
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: XxX,
): X & { r?: Hash } => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return {
      ...d[1],
      r: undefined,
    };
  } else if (o.length === 32) {
    // it's an hash
    return {
      ...d[0],
      r: o as unknown as Hash,
    };
  } else {
    return {
      ...d[0],
      r: undefined,
    };
  }
};

/**
 * (260)
 */
function check_fn(
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
type XxX = [x: X, y: X];
type LimitedPVMContext = Omit<PVMProgramExecutionContext, "instructionPointer">;
type Output = LimitedPVMContext & {
  r: XxX;
};

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
