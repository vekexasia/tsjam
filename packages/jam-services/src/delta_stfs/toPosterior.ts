import {
  Delta,
  DoubleDagger,
  Posterior,
  ServiceAccount,
  ServiceIndex,
  newSTF,
  u64,
} from "@vekexasia/jam-types";
type AccResultItem = {
  // service account after accummulation
  s: ServiceAccount | undefined;
  // dictionary of newly created services
  n: Map<ServiceIndex, ServiceAccount>;
  t: Array<{ d: ServiceIndex; /** balance to send **/ a: u64 }>;
};

type Input = {
  accummulationResult: Map<ServiceIndex, AccResultItem>;
};
export const deltaToPosterior = newSTF<
  DoubleDagger<Delta>,
  Input,
  Posterior<Delta>
>((input, curState) => {
  //  const S = new Set(input.accummulationResult.keys());
  const R = new Map<ServiceIndex, AccResultItem["t"]>();
  for (const [, accRes] of input.accummulationResult) {
    accRes.t.forEach(({ d, a }) => {
      if (!R.has(d)) {
        R.set(d, []);
      }
      R.get(d)!.push({ d, a });
    });
  }
  const result = new Map(curState) as Posterior<Delta>;
  for (const [service, accRes] of R) {
    let dd_delta_s = result.get(service)!;

    dd_delta_s = {
      ...dd_delta_s,
      balance: dd_delta_s.balance + accRes.reduce((acc, { a }) => acc + a, 0n),
    };

    if (dd_delta_s.codeHash === null) {
      result.set(service, dd_delta_s);
    } else {
      // see (261) TODO
    }
  }
  return result;
});
