import { accumulateInvocation } from "@tsjam/pvm";
import {
  AuthorizerQueue,
  Dagger,
  Delta,
  PVMAccumulationOp,
  PrivilegedServices,
  SafroleState,
  ServiceIndex,
  Tau,
  u64,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

/**
 * (162)
 */
export const accumulate = (conf: {
  s: ServiceIndex;
  d_delta: Dagger<Delta>;
  safroleState: SafroleState;
  tau: Tau;
  authorizerQueue: AuthorizerQueue;
  gas: u64;
  Xg_s: u64;
  o: PVMAccumulationOp[];
  privilegedServices: PrivilegedServices;
}): ReturnType<typeof accumulateInvocation> => {
  return accumulateInvocation(
    conf.d_delta,
    conf.s,
    toTagged(conf.gas + conf.Xg_s),
    conf.o,
    {
      iota: conf.safroleState.iota,
      authQueue: conf.authorizerQueue,
      tau: conf.tau,
      privilegedServices: conf.privilegedServices,
    },
  );
};
