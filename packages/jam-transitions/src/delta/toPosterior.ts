import {
  DeferredTransfer,
  Delta,
  DoubleDagger,
  Posterior,
  ServiceIndex,
} from "@tsjam/types";
import { newSTF } from "@tsjam/utils";

type Input = {
  accummulationResult: Map<ServiceIndex, AccResultItem>;
};
// (168) (261)
export const deltaToPosterior = newSTF<
  DoubleDagger<Delta>,
  Input,
  Posterior<Delta>
>((input, curState) => {
  const R = (t: DeferredTransfer[], d: ServiceIndex) => {
    t.slice()
      .sort((a, b) => {
        if (a.sender === b.sender) {
          return a.destination - b.destination;
        }
        return a.sender - b.sender;
      })
      .filter((t) => t.destination === d);
  };

  const p_delta: Delta = new Map();

  const omegatres = omega_t();
  const R = new Map<ServiceIndex, AccResultItem["t"]>();
  return null;
});
